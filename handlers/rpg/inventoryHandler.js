const { getUsers, isUserRegistered } = require('../../utils/databaseHelper');
const fishList = require('../../data/fishData'); // Untuk ngecek mana yang ikan

async function handleInventory(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const users = getUsers();
    const user = users[sender];

    const fishMap = {};
    fishList.forEach(f => {
        // Simpan dalam lowercase agar case-insensitive
        fishMap[f.name.toLowerCase()] = { name: f.name, rarity: f.rarity };
    });

    const rarityRank = {
        divine: 8,
        mythic: 7,
        legendary: 6,
        epic: 5,
        rare: 4,
        uncommon: 3,
        common: 2,
        trash: 1
    };

    let rawFishes = [];
    let equipments = []; // Lure & Net
    let consumables = []; // Potion, Buff Scroll, dll
    let others = [];

    if (user.inventory && Object.keys(user.inventory).length > 0) {
        Object.entries(user.inventory).forEach(([item, count]) => {
            // Abaikan state internal atau item yang bernilai <= 0 atau bukan angka positif
            if (
                item.startsWith('fishing') || 
                item === 'stamina' || 
                item === 'lastStaminaRegen' || 
                item === 'lastAdventure' || 
                item === 'lastBattle' || 
                item === 'buffActive' || 
                item === 'buffCharges' || 
                item === 'lastBankInterest' || 
                item === 'pets' || 
                item === 'activePet' || 
                item === 'active_background' || 
                item === 'farms' || 
                item === 'farmLevel' || 
                item === 'job' || 
                item === 'jobLevel' || 
                item === 'jobExp' || 
                item === 'fishIndex' || 
                item === 'petIndex'
            ) {
                return;
            }

            // Hapus / abaikan item yang bernilai <= 0
            if (typeof count === 'number' && count <= 0) {
                delete user.inventory[item];
                return;
            }

            const matchedFish = fishMap[item.toLowerCase()];
            if (matchedFish) {
                const rarity = matchedFish.rarity;
                let rarityEmoji = "🐟";
                let rarityTag = "[C]";
                
                if (rarity === "trash") { rarityEmoji = "🗑️"; rarityTag = "[Trash]"; }
                else if (rarity === "common") { rarityEmoji = "🐟"; rarityTag = "[Common]"; }
                else if (rarity === "uncommon") { rarityEmoji = "🐡"; rarityTag = "[Uncommon]"; }
                else if (rarity === "rare") { rarityEmoji = "🐠"; rarityTag = "[Rare]"; }
                else if (rarity === "epic") { rarityEmoji = "🐙"; rarityTag = "[Epic]"; }
                else if (rarity === "legendary") { rarityEmoji = "🦈"; rarityTag = "[Legendary]"; }
                else if (rarity === "mythic") { rarityEmoji = "🐉"; rarityTag = "[Mythic]"; }
                else if (rarity === "divine") { rarityEmoji = "✨"; rarityTag = "[Divine]"; }
                
                rawFishes.push({
                    text: `${rarityEmoji} *${matchedFish.name}* \`${rarityTag}\` (x${count})`,
                    rank: rarityRank[rarity] || 0,
                    name: matchedFish.name,
                    count: count
                });
            } else if (item.includes("Lure") || item.includes("Net") || item.includes("Rod")) {
                let eqEmoji = "🎣";
                if (item.includes("Net")) eqEmoji = "🕸️";
                if (item.includes("Lure")) eqEmoji = "🪀";
                equipments.push(`${eqEmoji} *${item}* (x${count})`);
            } else if (["Potion", "Buff Scroll", "Exp Book", "Gold Coin"].includes(item)) {
                let conEmoji = "🧪";
                if (item === "Buff Scroll") conEmoji = "📜";
                if (item === "Exp Book") conEmoji = "📖";
                if (item === "Gold Coin") conEmoji = "🪙";
                consumables.push(`${conEmoji} *${item}* (x${count})`);
            } else {
                let othEmoji = "📦";
                if (item.startsWith("Bibit")) othEmoji = "🌱";
                others.push(`${othEmoji} *${item}* (x${count})`);
            }
        });
    }

    // Urutkan ikan dari rarity tertinggi ke terendah (Divine -> Mythic -> Legendary -> Epic -> Rare -> Uncommon -> Common -> Trash)
    rawFishes.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));
    const fishes = rawFishes.map(f => f.text);

    let inventoryText = `🎒 *INVENTORY ${user.name.toUpperCase()}* 🎒\n\n`;

    if (fishes.length === 0 && equipments.length === 0 && consumables.length === 0 && others.length === 0) {
        inventoryText += `_Tas kamu kosong melompong!_ 🥺\n_Ayo *!mancing* atau *!petualang* buat dapetin barang._`;
    } else {
        if (equipments.length > 0) {
            inventoryText += `🛠️ *Alat Pancing:*\n${equipments.join('  •  ')}\n\n`;
        }
        if (consumables.length > 0) {
            inventoryText += `🎁 *Consumable:*\n${consumables.join('  •  ')}\n\n`;
        }
        if (fishes.length > 0) {
            inventoryText += `🐠 *Hasil Tangkapan:*\n${fishes.join('  •  ')}\n\n`;
        }
        if (others.length > 0) {
            inventoryText += `📦 *Item Lainnya:*\n${others.join('  •  ')}\n\n`;
        }
        
        inventoryText += `_💡 Ketik *!pakai [nama_item]* untuk memakai barang._`;
    }

    return sock.sendMessage(from, { text: inventoryText.trim() }, { quoted: msg });
}

module.exports = { handleInventory };