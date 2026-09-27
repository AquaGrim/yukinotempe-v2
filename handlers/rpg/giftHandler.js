const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

const ADMIN_NUMBER = "6281292744550"; // Nomor owner (kamu)

async function handleGift(sock, msg, from, sender, args) {
    const senderNumber = sender.split('@')[0];
    
    if (senderNumber !== ADMIN_NUMBER) {
        return sock.sendMessage(from, { text: 'Cuma owner yang boleh pakai command ini! 🥺' }, { quoted: msg });
    }

    // Mendapatkan tag/mention
    const mentionedJidList = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (mentionedJidList.length === 0 || args.length < 2) {
        return sock.sendMessage(from, { text: 'Cara pakai:\n*!gift @tag_orang nama_item jumlah*\nContoh:\n*!gift @user money 1000*\n*!gift @user potion 5*' }, { quoted: msg });
    }

    const targetUser = mentionedJidList[0];
    if (!isUserRegistered(targetUser)) {
        return sock.sendMessage(from, { text: 'Orang yang kamu tag belum daftar bot Yukinotempe! 🥺' }, { quoted: msg });
    }

    // Buang tag dari argumen
    args.shift();
    
    const amountStr = args.pop();
    let amount = parseInt(amountStr);
    
    // Kalau yang terakhir bukan angka, anggap amount 1 dan masukin argumen terakhir ke nama item
    if (isNaN(amount)) {
        args.push(amountStr);
        amount = 1;
    }

    const itemName = args.join(" "); // misal: "gold coin"
    
    if (!itemName) {
         return sock.sendMessage(from, { text: 'Kamu mau ngasih apa? Nama itemnya belum diisi 🥺' }, { quoted: msg });
    }

    if (amount <= 0) {
        return sock.sendMessage(from, { text: 'Jumlahnya harus lebih dari 0 dong 🥺' }, { quoted: msg });
    }

    const user = getUser(targetUser);

    if (itemName.toLowerCase() === "money" || itemName.toLowerCase() === "gold") {
        user.money += amount;
        saveUsers({ [targetUser]: user });
        return sock.sendMessage(from, { text: `🎁 *BERHASIL GIFT* 🎁\nKamu memberikan *${amount} Gold* kepada @${targetUser.split('@')[0]}!`, mentions: [targetUser] });
    } else {
        // Format Nama Item: kapital awal tiap kata (opsional, tapi biar rapi)
        const formattedItemName = itemName.replace(/\b\w/g, l => l.toUpperCase());
        
        user.inventory[formattedItemName] = (user.inventory[formattedItemName] || 0) + amount;
        saveUsers({ [targetUser]: user });
        return sock.sendMessage(from, { text: `🎁 *BERHASIL GIFT* 🎁\nKamu memberikan *${amount}x ${formattedItemName}* kepada @${targetUser.split('@')[0]}!`, mentions: [targetUser] });
    }
}

module.exports = {
    handleGift
};
