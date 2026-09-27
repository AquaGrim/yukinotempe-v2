const { getUsers, isUserRegistered } = require('../../utils/databaseHelper');
const fishList = require('../../data/fishData'); // Untuk ngecek mana yang ikan

async function handleInventory(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const users = getUsers();
    const user = users[sender];

    const allFishes = fishList.map(f => f.name);

    let fishes = [];
    let equipments = []; // Lure & Net
    let consumables = []; // Potion, Buff Scroll, dll
    let others = [];

    if (user.inventory && Object.keys(user.inventory).length > 0) {
        Object.entries(user.inventory).forEach(([item, count]) => {
            // Abaikan state internal
            if (item.startsWith('fishing') || item === 'stamina' || item === 'lastStaminaRegen' || item === 'lastAdventure' || item === 'lastBattle' || item === 'buffActive') {
                return;
            }

            if (allFishes.includes(item)) {
                fishes.push(`🐟 ${item}: ${count}x`);
            } else if (item.includes("Lure") || item.includes("Net")) {
                equipments.push(`🎣 ${item}: ${count}x`);
            } else if (["Potion", "Buff Scroll", "Exp Book", "Gold Coin"].includes(item)) {
                consumables.push(`🧪 ${item}: ${count}x`);
            } else {
                others.push(`📦 ${item}: ${count}x`);
            }
        });
    }

    let inventoryText = `🎒 *INVENTORY ${user.name.toUpperCase()}* 🎒\n\n`;

    if (fishes.length === 0 && equipments.length === 0 && consumables.length === 0 && others.length === 0) {
        inventoryText += `_Tas kamu kosong melompong!_ 🥺\n_Ayo *!mancing* atau *!petualang* buat dapetin barang._`;
    } else {
        if (consumables.length > 0) {
            inventoryText += `*🎁 Consumable (Bisa Dipakai)*\n${consumables.join('\n')}\n\n`;
        }
        if (equipments.length > 0) {
            inventoryText += `*🛠️ Alat Pancing (Otomatis)*\n${equipments.join('\n')}\n\n`;
        }
        if (fishes.length > 0) {
            inventoryText += `*🐠 Hasil Tangkapan (Bisa Dijual)*\n${fishes.join('\n')}\n\n`;
        }
        if (others.length > 0) {
            inventoryText += `*📦 Lainnya*\n${others.join('\n')}\n\n`;
        }
        
        inventoryText += `_💡 Ketik *!pakai [nama_item]* untuk memakai barang._`;
    }

    return sock.sendMessage(from, { text: inventoryText.trim() }, { quoted: msg });
}

module.exports = { handleInventory };