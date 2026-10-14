const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

const GACHA_COST = 250; // Harga 1x Gacha

async function handleGacha(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    const usersMap = { [sender]: user };

    const jumlahGacha = parseInt(args[0]) || 1;

    if (jumlahGacha < 1 || isNaN(jumlahGacha)) {
        return sock.sendMessage(from, { text: 'Jumlah gacha harus berupa angka minimal 1! 🥺\nContoh: *!gacha 10*' }, { quoted: msg });
    }

    const totalCost = jumlahGacha * GACHA_COST;

    if (user.money < totalCost) {
        return sock.sendMessage(from, { text: `Uangmu tidak cukup 🥺\nButuh *${totalCost} Gold* untuk ${jumlahGacha}x gacha.` }, { quoted: msg });
    }

    user.money -= totalCost;

    let dapet = {
        Potion: 0,
        "Gold Coin": 0,
        "Buff Scroll": 0,
        "Gacha ZONK": 0,
        Kazuha: 0, Furina: 0, "Raiden Shogun": 0,
        "Kamisato Ayato": 0, Tartaglia: 0, "Vestia Zeta": 0,
        Sakura: 0, "Mythia Batford": 0, "Gwar Gura": 0,
        "Monkey D. Luffy": 0, "Nephie Phelia": 0, "Mie Ayam": 0
    };

    for (let i = 0; i < jumlahGacha; i++) {
        const chance = Math.random();
        let reward = "Gacha ZONK";

        if (chance < 0.2) reward = "Potion";
        else if (chance < 0.35) reward = "Gold Coin";
        else if (chance < 0.55) reward = "Buff Scroll";
        else if (chance < 0.551) reward = "Kazuha";
        else if (chance < 0.5511) reward = "Furina";
        else if (chance < 0.5512) reward = "Raiden Shogun";
        else if (chance < 0.5513) reward = "Kamisato Ayato";
        else if (chance < 0.5514) reward = "Tartaglia";
        else if (chance < 0.5515) reward = "Vestia Zeta";
        else if (chance < 0.5516) reward = "Sakura";
        else if (chance < 0.5517) reward = "Mythia Batford";
        else if (chance < 0.5518) reward = "Gwar Gura";
        else if (chance < 0.5519) reward = "Monkey D. Luffy";
        else if (chance < 0.552) reward = "Nephie Phelia";
        else if (chance < 0.56) reward = "Mie Ayam";

        dapet[reward]++;
        if (reward !== "Gacha ZONK") {
            user.inventory[reward] = (user.inventory[reward] || 0) + 1;
        }
    }

    saveUsers(usersMap);

    let replyMsg = `🎰 *GACHA YUKINOTEMPE (${jumlahGacha}x)* 🎰\n\n`;
    let itemsFound = false;

    // Filter yang jumlahnya lebih dari 0 dan format tampilannya
    const labelMap = {
        Potion: "🧪 Potion", "Gold Coin": "🪙 Gold Coin", "Buff Scroll": "📜 Buff Scroll",
        Kazuha: "🌟 Kazuha (Rare!)", Furina: "⭐ Furina (Epic!)", "Raiden Shogun": "⭐ Raiden Shogun (Epic!)",
        "Kamisato Ayato": "⭐ Kamisato Ayato (Epic!)", Tartaglia: "⭐ Tartaglia (Epic!)", "Vestia Zeta": "💜 Vestia Zeta (Legendary!)",
        Sakura: "🌸 Sakura (Epic!)", "Mythia Batford": "🦇 Mythia Batford (Epic!)", "Gwar Gura": "🦈 Gwar Gura (Epic!)",
        "Monkey D. Luffy": "🍖 Monkey D. Luffy (Epic!)", "Nephie Phelia": "🛡️ Nephie Phelia (Epic!)", "Mie Ayam": "🍜 Mie Ayam"
    };

    for (const [itemName, count] of Object.entries(dapet)) {
        if (count > 0 && itemName !== "Gacha ZONK") {
            replyMsg += `• ${labelMap[itemName] || itemName}: ${count}x\n`;
            itemsFound = true;
        }
    }

    if (dapet["Gacha ZONK"] > 0) {
        replyMsg += `\n❌ Gagal / ZONK: ${dapet["Gacha ZONK"]}x`;
    }

    if (!itemsFound) {
        replyMsg = `🎰 *GACHA YUKINOTEMPE (${jumlahGacha}x)* 🎰\n\nYaaahh sayang banget! 🥺\nSemua tarikanmu ampas / ZONK.\nCoba lagi lain waktu ya!`;
    }

    return sock.sendMessage(from, { text: replyMsg.trim() }, { quoted: msg });
}

module.exports = {
    handleGacha
};
