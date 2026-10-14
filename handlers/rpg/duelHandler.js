const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

// Menyimpan state duel sementara yang ditawarkan (key: lawanJid, value: dataDuel)
// Contoh data: { penantangJid: 'xxx', jumlahTaruhan: 1000, expiredAt: 123456 }
const pendingDuels = {};

const OWNER_JID = '6281292744550@s.whatsapp.net'; // ID Boskuu (untuk nampung uang pajak)

async function handleDuel(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    
    // Command !duel terima
    if (args[0] && args[0].toLowerCase() === 'terima') {
        const duelData = pendingDuels[sender];
        
        if (!duelData) {
            return sock.sendMessage(from, { text: 'Tidak ada tantangan duel untukmu saat ini 🥺' }, { quoted: msg });
        }
        
        if (Date.now() > duelData.expiredAt) {
            delete pendingDuels[sender];
            return sock.sendMessage(from, { text: 'Tantangan duel sudah kedaluwarsa! ⏱️' }, { quoted: msg });
        }
        
        const penantangUser = getUser(duelData.penantangJid);
        const taruhan = duelData.jumlahTaruhan;
        
        // Cek saldo keduanya
        if (user.money < taruhan) {
            return sock.sendMessage(from, { text: `Uangmu tidak cukup untuk menerima duel ini! (Butuh: ${taruhan} Gold)` }, { quoted: msg });
        }
        if (penantangUser.money < taruhan) {
            delete pendingDuels[sender];
            return sock.sendMessage(from, { text: `Penantang ternyata tidak memiliki cukup uang lagi! Duel dibatalkan. 💸` }, { quoted: msg });
        }
        
        // Tarik saldo masing-masing ke "pool"
        user.money -= taruhan;
        penantangUser.money -= taruhan;
        
        const totalTaruhan = taruhan * 2;
        
        // Fitur Pajak Boskuu (10% dari total hadiah kemenangan)
        const pajak = Math.floor(totalTaruhan * 0.10);
        const hadiahBersih = totalTaruhan - pajak;
        
        // Sistem Pure RNG
        const isPenantangMenang = Math.random() < 0.5;
        let winnerJid = isPenantangMenang ? duelData.penantangJid : sender;
        let winnerName = isPenantangMenang ? penantangUser.name : user.name;
        let loserName = isPenantangMenang ? user.name : penantangUser.name;
        
        // Berikan hadiah ke pemenang
        if (isPenantangMenang) {
            penantangUser.money += hadiahBersih;
        } else {
            user.money += hadiahBersih;
        }
        
        // Pungut pajak ke kantong Owner
        if (isUserRegistered(OWNER_JID)) {
            const ownerData = getUser(OWNER_JID);
            ownerData.money += pajak;
            saveUsers({ [OWNER_JID]: ownerData });
        }
        
        // Simpan state
        saveUsers({ [sender]: user, [duelData.penantangJid]: penantangUser });
        delete pendingDuels[sender];
        
        const replyText = `⚔️ *DUEL BERDARAH!* ⚔️\n\n` +
                          `Antara *${penantangUser.name}* VS *${user.name}*\n` +
                          `===================\n\n` +
                          `🎉 Pemenangnya adalah: **${winnerName}**! 🎉\n` +
                          `Kasihan sekali ${loserName} harus kehilangan ${taruhan} Gold.\n\n` +
                          `💰 *Hadiah Kemenangan:* ${hadiahBersih} Gold\n` +
                          `⚖️ _(Pajak Admin Desa 10%: ${pajak} Gold)_`;
                          
        return sock.sendMessage(from, { text: replyText });
    }
    
    // Command Tantangan: !duel [nominal] [@user / tag]
    if (args.length < 2) {
        return sock.sendMessage(from, { text: `Format salah!\nCara menantang: *!duel [taruhan] [@tag_lawan]*\nCara menerima: *!duel terima*\nContoh: *!duel 1000 @628xxx*` }, { quoted: msg });
    }
    
    const taruhan = parseInt(args[0]);
    if (isNaN(taruhan) || taruhan <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah taruhan tidak valid! Harus berupa angka di atas 0.' }, { quoted: msg });
    }
    
    if (user.money < taruhan) {
        return sock.sendMessage(from, { text: `Uangmu tidak cukup untuk bertaruh sebanyak itu! (Uangmu: ${user.money})` }, { quoted: msg });
    }
    
    // Deteksi Mentions
    const mentionedJidList = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentionedJidList.length === 0) {
        return sock.sendMessage(from, { text: 'Kamu harus me-mention (tag) orang yang ingin ditantang duel!' }, { quoted: msg });
    }
    
    let targetJid = mentionedJidList[0];
    
    // Konversi LID jika ada (Fallback)
    if (targetJid.endsWith('@lid')) {
        try {
            const pn = await sock.signalRepository.lidMapping.getPNForLID(targetJid);
            if (pn) targetJid = pn;
        } catch (err) {}
    }
    
    // Membersihkan JID multi-device
    if (targetJid.includes(':')) {
        targetJid = targetJid.split(':')[0] + '@s.whatsapp.net';
    }
    
    if (targetJid === sender) {
        return sock.sendMessage(from, { text: 'Kamu tidak bisa berduel dengan diri sendiri! 😂' }, { quoted: msg });
    }
    
    if (!isUserRegistered(targetJid)) {
        return sock.sendMessage(from, { text: 'Orang yang kamu tantang belum terdaftar di game ini 🥺' }, { quoted: msg });
    }
    
    const targetUser = getUser(targetJid);
    if (targetUser.money < taruhan) {
         return sock.sendMessage(from, { text: `Uang *${targetUser.name}* tidak cukup untuk meladeni taruhan ${taruhan} Gold ini!` }, { quoted: msg });
    }
    
    // Set Pending Duel (Berlaku 3 Menit)
    pendingDuels[targetJid] = {
        penantangJid: sender,
        jumlahTaruhan: taruhan,
        expiredAt: Date.now() + (3 * 60000) 
    };
    
    return sock.sendMessage(from, { 
        text: `⚔️ *TANTANGAN DUEL!* ⚔️\n\n*${user.name}* menantang *${targetUser.name}* untuk berduel dengan taruhan *${taruhan} Gold*!\n\nHalo @${targetJid.split('@')[0]}, balas pesan ini dengan mengetik:\n*!duel terima*\n_(Tantangan akan hangus dalam 3 Menit)_`,
        mentions: [targetJid]
    }, { quoted: msg });
}

module.exports = { handleDuel };
