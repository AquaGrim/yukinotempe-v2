const { getUser, saveUsers, isUserRegistered, getUsers } = require('../../utils/databaseHelper');

const backgroundMap = {
    "Kazuha": ["/images/bg/Kazuha.jpg"],
    "Furina": [
        "/images/bg/furina_processed/furina_1.jpg",
        "/images/bg/furina_processed/furina_2.jpg",
        "/images/bg/furina_processed/furina_3.jpg",
        "/images/bg/furina_processed/furina_4.jpg",
        "/images/bg/furina_processed/furina_5.jpg",
        "/images/bg/furina_processed/furina_6.jpg",
        "/images/bg/furina_processed/furina_7.jpg"
    ],
    "Raiden Shogun": ["/images/bg/RaidenShogun.jpg"],
    "Kamisato Ayato": ["/images/bg/KamisatoAyato.jpg"],
    "Tartaglia": ["/images/bg/Tartaglia.jpg"],
    "Vestia Zeta": [
        "/images/bg/zeta_processed/zeta_1.jpg",
        "/images/bg/zeta_processed/zeta_2.jpg",
        "/images/bg/zeta_processed/zeta_3.jpg",
        "/images/bg/zeta_processed/zeta_4.jpg",
        "/images/bg/zeta_processed/zeta_5.jpg",
        "/images/bg/zeta_processed/zeta_6.jpg",
        "/images/bg/zeta_processed/zeta_7.jpg",
        "/images/bg/zeta_processed/zeta_8.jpg"
    ],
    "Sakura": ["/images/bg/Sakura.jpg"],
    "Mythia Batford": ["/images/bg/MythiaBatford.jpg"],
    "Gwar Gura": ["/images/bg/GwarGura.jpg"],
    "Monkey D. Luffy": ["/images/bg/MonkeyDLuffy.jpg"],
    "Nephie Phelia": ["/images/bg/NephiePhelia.jpg"]
};

async function handleSetBackground(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const charName = args.join(" ");
    if (!charName) {
        return sock.sendMessage(from, { text: 'Pilih karakter anime yang ingin dijadikan background! 🥺\nContoh: *!setbg Furina*\n\n_Note: Kamu harus mendapatkan karakter tersebut dari gacha terlebih dahulu._' }, { quoted: msg });
    }

    // Mencari kecocokan nama karakter tanpa case-sensitive
    const matchedCharKey = Object.keys(backgroundMap).find(key => key.toLowerCase() === charName.toLowerCase());

    if (!matchedCharKey) {
        return sock.sendMessage(from, { text: `Karakter *${charName}* tidak ada di sistem background atau penulisan namanya salah 🥺` }, { quoted: msg });
    }

    const user = getUser(sender);
    
    // Cek apakah user punya karakter tersebut dari Gacha
    if (!user.inventory[matchedCharKey] || user.inventory[matchedCharKey] <= 0) {
        return sock.sendMessage(from, { text: `Kamu belum punya kartu *${matchedCharKey}*! 🥺\nSilakan main gacha dulu dengan *!gacha* untuk mengumpulkan karakternya.` }, { quoted: msg });
    }

    // Mengurangi 1 item karakter dari inventory sebagai biaya pasang/gacha background
    user.inventory[matchedCharKey] -= 1;
    const sisaItem = user.inventory[matchedCharKey];

    // Gacha varian gambar saat user memasang/mengganti background
    const variants = backgroundMap[matchedCharKey];
    const chosenIndex = Math.floor(Math.random() * variants.length);
    const chosenImage = variants[chosenIndex];

    // Simpan background karakter dan gambar terpilih secara permanen
    user.inventory.active_background = matchedCharKey;
    user.inventory.active_background_image = chosenImage;
    saveUsers({ [sender]: user });

    const totalVariant = variants.length;
    const variantInfo = totalVariant > 1 ? ` (Varian #${chosenIndex + 1} dari ${totalVariant})` : '';

    return sock.sendMessage(from, { text: `✨ Berhasil! 1x *${matchedCharKey}* digunakan dari inventory.\n\nBackground profil Web kamu sekarang dikunci ke *${matchedCharKey}*${variantInfo}! 🖼️💜\nSisa kartu di tas: *${sisaItem}x*\n\nLatar ini akan aktif terus sampai kamu ganti background atau gacha ulang lagi.\n\nCek sekarang dengan mengetik *!profil*` }, { quoted: msg });
}

async function handleProfile(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const users = getUsers();
    const user = users[sender];
    
    // Perhitungan EXP yang dibutuhkan untuk next level
    const nextLevelExp = user.level * 100;
    
    const staminaDisplay = user.stamina !== undefined ? user.stamina : (user.maxStamina || 10);
    const maxStaminaDisplay = user.maxStamina || 10;
    
    // Potong @s.whatsapp.net dari ID sender agar URL rapi
    const webId = sender.split('@')[0];
    const webLink = `https://slickpaper-epizoutically-oretha.ngrok-free.dev/player/${webId}`;

    const profileText = `📊 *PROFIL YUKINOTEMPE* 📊\n\n` +
                        `👤 *Nama:* ${user.name}\n` +
                        `🎂 *Umur:* ${user.age}\n` +
                        `🌟 *Level:* ${user.level}\n` +
                        `✨ *EXP:* ${user.exp} / ${nextLevelExp}\n` +
                        `💰 *Gold:* ${user.money || 0}\n` +
                        `⚡ *Stamina:* ${staminaDisplay} / ${maxStaminaDisplay}\n\n` +
                        `🌐 *Lihat Profil Web:* \n${webLink}\n\n` +
                        `_Ketik *!inv* atau *!inventory* untuk melihat isi tasmu._\n\n` +
                        `_Terdaftar pada: ${new Date(user.registeredAt).toLocaleDateString('id-ID')}_`;

    return sock.sendMessage(from, { text: profileText }, { quoted: msg });
}

async function handleLeaderboard(sock, msg, from, sender) {
    const users = getUsers();
    
    // Konversi object users ke array dan saring user yang banned
    let playerList = Object.keys(users)
        .map(id => ({
            id,
            name: users[id].name,
            level: users[id].level,
            money: users[id].money || 0,
            bank: users[id].bank || 0,
            isBanned: users[id].isBanned || 0
        }))
        .filter(player => player.isBanned === 0);

    if (playerList.length === 0) {
        return sock.sendMessage(from, { text: 'Belum ada player yang terdaftar 🥺' }, { quoted: msg });
    }

    // Urutkan berdasarkan Level tertinggi, kalau level sama urutkan berdasarkan Total Gold (Tangan + Bank) terbanyak
    playerList.sort((a, b) => {
        if (b.level !== a.level) {
            return b.level - a.level;
        }
        const totalGoldA = a.money + a.bank;
        const totalGoldB = b.money + b.bank;
        return totalGoldB - totalGoldA;
    });

    // Ambil 10 teratas
    const top10 = playerList.slice(0, 10);

    let text = "🏆 *LEADERBOARD YUKINOTEMPE* 🏆\n_Top 10 Player Terbaik (Berdasarkan Level & Total Gold)_\n\n";

    top10.forEach((p, index) => {
        let medal = "";
        if (index === 0) medal = "🥇";
        else if (index === 1) medal = "🥈";
        else if (index === 2) medal = "🥉";
        else medal = `[${index + 1}]`;

        const totalGold = p.money + p.bank;
        text += `${medal} *${p.name}* (Lvl ${p.level}) - 💰 ${totalGold.toLocaleString('id-ID')} G\n`;
    });

    return sock.sendMessage(from, { text: text.trim() }, { quoted: msg });
}

module.exports = { handleProfile, handleLeaderboard, handleSetBackground };