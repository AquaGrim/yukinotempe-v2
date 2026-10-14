const { getUser, saveUsers, isUserRegistered, getUsers } = require('../../utils/databaseHelper');
const { setEvent, clearEvent, checkActiveEvent } = require('../../utils/eventHelper');

// Gunakan nomor telepon owner lengkap dengan kode negara @s.whatsapp.net
// Format + dihilangkan sesuai standar JID Baileys, contoh: '6281292744550@s.whatsapp.net'
const ADMIN_NUMBER = '6281292744550@s.whatsapp.net'; 

async function handleAddGoldAll(sock, msg, from, sender, args) {
    const ADMIN_NUMBER = '6281292744550';
    
    // Mengecek apakah pengirim adalah admin
    const isSenderAdmin = sender.includes(ADMIN_NUMBER) || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!` }, { quoted: msg });
    }

    if (args.length < 1) {
        return sock.sendMessage(from, { text: 'Format salah! Gunakan: *!addgoldall [jumlah]*' }, { quoted: msg });
    }

    const jumlah = parseInt(args[0]);
    if (isNaN(jumlah) || jumlah <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah Gold harus berupa angka positif!' }, { quoted: msg });
    }

    const usersMap = getUsers();
    const allUsers = Object.keys(usersMap);
    
    if (allUsers.length === 0) {
        return sock.sendMessage(from, { text: 'Belum ada player terdaftar sama sekali!' }, { quoted: msg });
    }

    allUsers.forEach(id => {
        usersMap[id].money += jumlah;
    });

    saveUsers(usersMap);

    return sock.sendMessage(from, { text: `🎁 *KOMPENSASI DIBAGIKAN!* 🎁\n\n✅ Berhasil membagikan uang kaget sebesar 💰 *${jumlah.toLocaleString('id-ID')} Gold* ke seluruh player (*${allUsers.length} orang*)!\n\n_Semua uang telah masuk ke dompet masing-masing._` }, { quoted: msg });
}

async function handleAddGold(sock, msg, from, sender, args) {
    const ADMIN_NUMBER = '6281292744550';
    
    // Mengecek apakah pengirim adalah admin (baik format lengkap maupun tanpa @s.whatsapp.net)
    const isSenderAdmin = sender.includes(ADMIN_NUMBER) || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!\nNomormu terbaca sebagai: ${sender}` }, { quoted: msg });
    }

    if (args.length < 1) {
        return sock.sendMessage(from, { text: 'Format salah! Gunakan:\n• *!addgold me [jumlah]* atau *!addgold [jumlah] me* (isi ke akun sendiri)\n• *!addgold [jumlah] [@user]* (isi ke orang lain)' }, { quoted: msg });
    }

    let isTargetSelf = false;
    let jumlah = NaN;

    // Cek apakah argumen mengandung keyword "me" atau "saya"
    if (args[0].toLowerCase() === 'me' || args[0].toLowerCase() === 'saya') {
        isTargetSelf = true;
        jumlah = parseInt(args[1]);
    } else if (args.length >= 2 && (args[1].toLowerCase() === 'me' || args[1].toLowerCase() === 'saya')) {
        isTargetSelf = true;
        jumlah = parseInt(args[0]);
    } else {
        jumlah = parseInt(args[0]);
    }

    if (isNaN(jumlah) || jumlah <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah Gold harus berupa angka positif!\nContoh: *!addgold me 100000*' }, { quoted: msg });
    }

    let target = null;

    if (isTargetSelf) {
        target = sender;
    } else {
        // Mengambil target JID dari mention (tag)
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        target = mentionedJid[0];
        
        // Jika tidak tag, cek apakah me-reply pesan
        if (!target) {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quotedMsg) target = quotedMsg;
        }

        if (!target) {
            return sock.sendMessage(from, { text: 'Kamu harus men-tag (@) user, me-reply pesan user, atau gunakan *!addgold me [jumlah]* untuk diri sendiri!' }, { quoted: msg });
        }
    }

    // === LID MAPPING UNTUK TARGET ADDGOLD ===
    if (target.endsWith('@lid')) {
        try {
            const pnTarget = await sock.signalRepository.lidMapping.getPNForLID(target);
            if (pnTarget) target = pnTarget;
        } catch (e) {
            console.error('[WARNING] Gagal me-resolve LID target:', e);
        }
    }
    
    if (target.includes(':')) {
        target = target.split(':')[0] + '@s.whatsapp.net';
    }

    if (!isUserRegistered(target)) {
        return sock.sendMessage(from, { text: 'User tersebut belum terdaftar di database bot.' }, { quoted: msg });
    }

    const user = getUser(target);
    const usersMap = { [target]: user };

    user.money += jumlah;
    saveUsers(usersMap);

    const targetName = isTargetSelf ? 'kamu sendiri' : `@${target.split('@')[0]}`;
    const mentionList = isTargetSelf ? [] : [target];

    return sock.sendMessage(from, { text: `✅ Berhasil menambahkan 💰 *${jumlah.toLocaleString('id-ID')} Gold* ke ${targetName}!\nTotal Gold saat ini: 💰 *${user.money.toLocaleString('id-ID')}*`, mentions: mentionList }, { quoted: msg });
}

async function handleTakeGold(sock, msg, from, sender, args) {
    const ADMIN_NUMBER = '6281292744550';
    
    // Mengecek apakah pengirim adalah admin
    const isSenderAdmin = sender.includes(ADMIN_NUMBER) || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!` }, { quoted: msg });
    }

    if (args.length < 2) {
        return sock.sendMessage(from, { text: 'Format salah! Gunakan: *!takegold [jumlah] [@user]*' }, { quoted: msg });
    }

    const jumlah = parseInt(args[0]);
    if (isNaN(jumlah) || jumlah <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah Gold harus berupa angka positif!' }, { quoted: msg });
    }

    // Mengambil target JID dari mention (tag) atau reply
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentionedJid[0];
    
    if (!target) {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedMsg) target = quotedMsg;
    }

    if (!target) {
        return sock.sendMessage(from, { text: 'Kamu harus men-tag (@) user atau me-reply pesan user yang mau ditarik Gold-nya!' }, { quoted: msg });
    }

    // === LID MAPPING ===
    if (target.endsWith('@lid')) {
        try {
            const pnTarget = await sock.signalRepository.lidMapping.getPNForLID(target);
            if (pnTarget) target = pnTarget;
        } catch (e) {}
    }
    
    if (target.includes(':')) {
        target = target.split(':')[0] + '@s.whatsapp.net';
    }

    if (!isUserRegistered(target)) {
        return sock.sendMessage(from, { text: 'User tersebut belum terdaftar di database bot.' }, { quoted: msg });
    }

    const targetUser = getUser(target);
    
    if (targetUser.money < jumlah) {
        return sock.sendMessage(from, { text: `Gagal menarik! Uang dompet @${target.split('@')[0]} cuma tersisa 💰 *${targetUser.money} Gold*. Tidak cukup ditarik sebanyak *${jumlah}*.`, mentions: [target] }, { quoted: msg });
    }

    targetUser.money -= jumlah;
    
    const adminUser = getUser(sender);
    adminUser.money += jumlah; // Uangnya otomatis pindah ke dompet Admin!

    saveUsers({ 
        [target]: targetUser,
        [sender]: adminUser
    });

    return sock.sendMessage(from, { text: `🚨 *PENYITAAN GOLD* 🚨\nAdmin telah menarik paksa 💰 *${jumlah.toLocaleString('id-ID')} Gold* dari dompet @${target.split('@')[0]}!\n\n_Uang sitaan masuk ke dompet Admin!_ 🤑`, mentions: [target] }, { quoted: msg });
}

async function handleBanUser(sock, msg, from, sender, args, isBan, isAiOnly = false) {
    const isSenderAdmin = sender.includes('6281292744550') || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!` }, { quoted: msg });
    }

    // Mengambil target JID dari mention (tag)
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let target = mentionedJid[0];
    
    // Jika tidak tag, cek apakah me-reply pesan
    if (!target) {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedMsg) target = quotedMsg;
    }

    if (!target) {
        const typeText = isAiOnly ? 'AI Yuki' : 'Bot Global';
        return sock.sendMessage(from, { text: `Kamu harus men-tag (@) user atau me-reply pesan user yang mau di-${isBan ? 'ban' : 'unban'} dari fitur ${typeText}!` }, { quoted: msg });
    }

    // === LID MAPPING UNTUK TARGET BAN ===
    if (target.endsWith('@lid')) {
        try {
            const pnTarget = await sock.signalRepository.lidMapping.getPNForLID(target);
            if (pnTarget) target = pnTarget;
        } catch (e) {
            console.error('[WARNING] Gagal me-resolve LID target:', e);
        }
    }
    
    if (target.includes(':')) {
        target = target.split(':')[0] + '@s.whatsapp.net';
    }

    if (!isUserRegistered(target)) {
        return sock.sendMessage(from, { text: 'User tersebut belum terdaftar di database bot.' }, { quoted: msg });
    }

    const user = getUser(target);
    const usersMap = { [target]: user };

    if (isAiOnly) {
        user.isAiBanned = isBan ? 1 : 0;
    } else {
        user.isBanned = isBan ? 1 : 0;
    }
    
    saveUsers(usersMap);

    const typeStr = isAiOnly ? 'fitur Ngobrol AI Yuki 🤖' : 'seluruh fitur Bot 🚫';
    const statusText = isBan ? 'BANNED' : 'UNBANNED';
    return sock.sendMessage(from, { text: `User @${target.split('@')[0]} berhasil di-${statusText} dari ${typeStr}!`, mentions: [target] }, { quoted: msg });
}

async function handleListUsers(sock, msg, from, sender) {
    const isSenderAdmin = sender.includes('6281292744550') || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!` }, { quoted: msg });
    }

    const users = getUsers();
    
    const playerList = Object.keys(users)
        .map(id => ({
            id,
            name: users[id].name,
            level: users[id].level,
            money: users[id].money || 0,
            isBanned: users[id].isBanned || 0,
            isAiBanned: users[id].isAiBanned || 0,
            registeredAt: users[id].registeredAt
        }));

    if (playerList.length === 0) {
        return sock.sendMessage(from, { text: 'Belum ada player di database 🥺' }, { quoted: msg });
    }

    // Urutkan berdasarkan pendaftaran terbaru
    playerList.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    let text = "📋 *DAFTAR SEMUA USER YUKINOTEMPE* 📋\n_Hanya Admin_\n\n";
    text += `Total Player: *${playerList.length} User*\n\n`;

    playerList.forEach((p, index) => {
        let statusTag = "";
        if (p.isBanned) statusTag += " [🚫 BANNED]";
        if (p.isAiBanned) statusTag += " [🤖 AI BAN]";

        const jidDisplay = p.id.split('@')[0];
        
        text += `${index + 1}. *${p.name}* (@${jidDisplay})\n`;
        text += `   Lvl ${p.level} | 💰 ${p.money.toLocaleString('id-ID')} G ${statusTag}\n`;
    });

    return sock.sendMessage(from, { text: text.trim(), mentions: playerList.map(p => p.id) }, { quoted: msg });
}

async function handleEventAdmin(sock, msg, from, sender, args) {
    const ADMIN_NUMBER = '6281292744550';
    const isSenderAdmin = sender.includes(ADMIN_NUMBER) || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!` }, { quoted: msg });
    }

    if (args.length === 0) {
        const activeEvent = checkActiveEvent();
        if (activeEvent.active) {
            const timeLeft = Math.floor((activeEvent.expiredAt - Date.now()) / 60000); // menit
            return sock.sendMessage(from, { text: `🎉 *EVENT SEDANG AKTIF!* 🎉\n- Harga Jual Ikan: *${activeEvent.priceMultiplier}x*\n- Keberuntungan Mancing: *${activeEvent.luckMultiplier}x*\n⏳ *Sisa Waktu:* ${timeLeft} menit.\n\n_Untuk mematikan: !event stop_` }, { quoted: msg });
        } else {
            return sock.sendMessage(from, { text: `Tulis: *!event [hargaX] [luckX] [menit] [nonotif(opsional)] [keterangan...]*\nContoh: *!event 2 1.5 30 Tahun Baru!*\n_(Artinya harga 2x, luck 1.5x, durasi 30 menit, dan info ke semua user dengan keterangan Tahun Baru!)_\n\nJika ingin diam-diam, tulis 'nonotif' sesudah menit:\nContoh: *!event 2 1.5 30 nonotif*` }, { quoted: msg });
        }
    }

    if (args[0].toLowerCase() === 'stop') {
        clearEvent();
        return sock.sendMessage(from, { text: `🛑 *Event Buff telah dihentikan secara paksa!* Harga dan Luck kembali normal.` }, { quoted: msg });
    }

    if (args.length < 3) {
         return sock.sendMessage(from, { text: `Format salah! Tulis: *!event [hargaX] [luckX] [durasi_menit] [nonotif(opsional)] [keterangan...]*` }, { quoted: msg });
    }

    const eventData = setEvent(args[0], args[2], args[1]);
    
    let isSilent = false;
    let descIndex = 3;
    if (args[3] && args[3].toLowerCase() === 'nonotif') {
        isSilent = true;
        descIndex = 4;
    }
    const customDesc = args.slice(descIndex).join(" ");
    
    // Broadcast event ke semua user!
    const usersMap = getUsers();
    const allUsers = Object.keys(usersMap);
    
    const broadcastText = `🎉 *SERVER EVENT AKTIF!* 🎉\n\nWahai para pemancing!\nSelama *${args[2]} Menit* ke depan, server mendapatkan BUFF!\n${customDesc ? `\n🌟 *Event:* ${customDesc}\n` : ''}\n💰 *Harga Jual Ikan:* x${eventData.priceMultiplier}\n🍀 *Luck Pancingan:* x${eventData.luckMultiplier}\n\nAyo buruan jual ikanmu dan mancing sepuasnya sebelum event habis! 🏃‍♂️💨`;

    if (isSilent) {
        return sock.sendMessage(from, { text: `✅ *Event Buff SILENT berhasil diaktifkan selama ${args[2]} menit!*\n(Event berjalan tanpa memberitahu player manapun)` }, { quoted: msg });
    }

    // Kirim pesan ke nomor owner sebagai laporan sukses
    await sock.sendMessage(from, { text: `✅ *Event Buff berhasil diaktifkan selama ${args[2]} menit!*\nKeterangan: ${customDesc || 'Tidak ada'}\nBot sekarang sedang mem-broadcast pesan event ke ${allUsers.length} player...` }, { quoted: msg });

    // Broadcast diam-diam ke semua orang
    for (const jid of allUsers) {
        if (jid !== sender) {
            // Beri jeda agar anti-spam whatsapp tidak marah (1 detik per user)
            setTimeout(async () => {
                 try { await sock.sendMessage(jid, { text: broadcastText }); } catch(e){}
            }, 1000);
        }
    }
}

async function handleTerminalExec(sock, msg, from, sender, args) {
    const ADMIN_NUMBER = '6281292744550';
    const isSenderAdmin = sender.includes(ADMIN_NUMBER) || msg.key.fromMe;

    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: '❌ Perintah ini khusus Owner Bot!' }, { quoted: msg });
    }

    const command = args.join(' ');
    if (!command) {
        return sock.sendMessage(from, { text: 'Format: *!exec [perintah linux]*\nContoh:\n- *!exec restart-gateway*\n- *!exec pm2 status*\n- *!exec uptime*' }, { quoted: msg });
    }

    // Shortcut khusus untuk restart OpenClaw Gateway (mendukung berbagai format penulisan)
    let execCmd = command;
    const normalizedCmd = command.toLowerCase().replace(/[\s\-_]+/g, '');
    if (
        normalizedCmd === 'restartgateway' || 
        normalizedCmd === 'restartopenclaw' ||
        normalizedCmd === 'restartgateway_' ||
        normalizedCmd === 'restartopenclaw_'
    ) {
        execCmd = '/home/aquagrim/.openclaw/workspace/yukinotempe_v2/scripts/restart_openclaw.sh';
    }

    const { exec } = require('child_process');
    await sock.sendMessage(from, { text: `⏳ Menjalankan perintah:\n\`\`\`${execCmd}\`\`\`` }, { quoted: msg });

    exec(execCmd, { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        let response = '';
        if (stdout && stdout.trim()) {
            response += `📤 *Output:*\n\`\`\`\n${stdout.trim().slice(0, 3000)}\n\`\`\`\n`;
        }
        if (stderr && stderr.trim()) {
            response += `⚠️ *Stderr:*\n\`\`\`\n${stderr.trim().slice(0, 1000)}\n\`\`\`\n`;
        }
        if (error) {
            response += `❌ *Error code:* ${error.code || error.message}\n`;
        }
        if (!response.trim()) {
            response = '✅ Perintah selesai dijalankan tanpa output.';
        }

        sock.sendMessage(from, { text: response.trim() }, { quoted: msg });
    });
}

module.exports = {
    handleAddGold,
    handleAddGoldAll,
    handleTakeGold,
    handleBanUser,
    handleListUsers,
    handleEventAdmin,
    handleTerminalExec
};
