const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');

const itemMap = {
    potion: "Potion",
    "buff scroll": "Buff Scroll",
    "exp book": "Exp Book",
    "gold coin": "Gold Coin"
};

async function handleUseItem(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    if (args.length === 0) return sock.sendMessage(from, { text: 'Gunakan: *!pakai [nama_item] [jumlah]*\nContoh: *!pakai potion 2*' }, { quoted: msg });

    const user = getUser(sender);
    
    // Fallback inisialisasi stamina kalau belum ada di database lama
    if (user.stamina === undefined) user.stamina = user.maxStamina || 10;

    let quantity = 1;
    const lastArg = args[args.length - 1];
    
    if (!isNaN(parseInt(lastArg))) {
        quantity = parseInt(args.pop());
    }

    const itemKey = args.join(" ").toLowerCase();
    const itemName = itemMap[itemKey];

    if (!itemName) return sock.sendMessage(from, { text: 'Item itu tidak bisa dipakai atau tidak ada 🥺' }, { quoted: msg });

    const owned = user.inventory[itemName] || 0;
    if (owned < quantity) return sock.sendMessage(from, { text: `Kamu nggak punya cukup item 🥺 (Punya: ${owned})` }, { quoted: msg });

    // Terapkan efek item
    let replyText = "";
    if (itemName === "Potion") {
        const maxStamina = user.maxStamina || 10;
        
        if (user.stamina >= maxStamina) {
             return sock.sendMessage(from, { text: `Staminamu sudah penuh (Max: ${maxStamina})! 🥺 Sayang potionnya.` }, { quoted: msg });
        }
        
        const staminaGain = 3 * quantity;
        user.stamina += staminaGain;
        if (user.stamina > maxStamina) user.stamina = maxStamina;
        
        replyText = `🧪 *Glupp.. Glupp..*\nKamu meminum ${quantity}x Potion dan mendapatkan *+${staminaGain} Stamina*!\n(Stamina: *${user.stamina}/${maxStamina}*).`;
    } else if (itemName === "Exp Book") {
        const expGain = 50 * quantity;
        const levelUpMsg = addExp(sender, expGain); // Perlu diupdate ke db lagi nanti lewat return
        replyText = `📘 Kamu membaca ${quantity}x Exp Book dan mendapatkan *+${expGain} EXP*!`;
        if (levelUpMsg) replyText += `\n🎉 ${levelUpMsg}`;
    } else if (itemName === "Buff Scroll") {
        user.inventory.buffActive = true;
        replyText = `📜 *WUSHH!*\nKamu menggunakan Buff Scroll! Peluang menang di \`!lawan\` meningkat 25% untuk 1x pertarungan berikutnya.`;
    } else if (itemName === "Gold Coin") {
        const goldGain = 125 * quantity;
        user.money += goldGain;
        replyText = `🪙 *CLING!*\nKamu mencairkan ${quantity}x Gold Coin dan mendapatkan *+${goldGain} Gold*!`;
    }

    // Kurangi item
    user.inventory[itemName] -= quantity;
    if (user.inventory[itemName] <= 0) delete user.inventory[itemName];
    user.inventory.stamina = user.stamina;

    saveUsers({ [sender]: user });
    return sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

module.exports = {
    handleUseItem
};
