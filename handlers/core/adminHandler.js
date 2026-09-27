const { getUser, saveUsers, isUserRegistered, getUsers } = require('../../utils/databaseHelper');

// Gunakan nomor telepon owner lengkap dengan kode negara @s.whatsapp.net
// Format + dihilangkan sesuai standar JID Baileys, contoh: '6281292744550@s.whatsapp.net'
const ADMIN_NUMBER = '6281292744550@s.whatsapp.net'; 

async function handleAddGold(sock, msg, from, sender, args) {
    const ADMIN_NUMBER = '6281292744550';
    
    // Mengecek apakah pengirim adalah admin (baik format lengkap maupun tanpa @s.whatsapp.net)
    const isSenderAdmin = sender.includes(ADMIN_NUMBER) || msg.key.fromMe;
    
    if (!isSenderAdmin) {
        return sock.sendMessage(from, { text: `❌ Perintah ini hanya bisa digunakan oleh Admin (Owner Bot)!\nNomormu terbaca sebagai: ${sender}` }, { quoted: msg });
    }

    if (args.length < 2) {
        return sock.sendMessage(from, { text: 'Format salah! Gunakan: *!addgold [jumlah] [@user]*' }, { quoted: msg });
    }

    const jumlah = parseInt(args[0]);
    if (isNaN(jumlah) || jumlah <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah Gold harus berupa angka positif!' }, { quoted: msg });
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
        return sock.sendMessage(from, { text: 'Kamu harus men-tag (@) user atau me-reply pesan user yang mau diisi Gold-nya!' }, { quoted: msg });
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

    return sock.sendMessage(from, { text: `✅ Berhasil menambahkan 💰 *${jumlah} Gold* ke akun @${target.split('@')[0]}!\nTotal Gold mereka sekarang: 💰 *${user.money}*`, mentions: [target] }, { quoted: msg });
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

module.exports = {
    handleAddGold,
    handleBanUser,
    handleListUsers
};
