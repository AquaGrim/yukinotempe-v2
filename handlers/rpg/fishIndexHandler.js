const fishList = require('../../data/fishData');
const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

// Menghitung bonus luck dari index (bertahap sampai total 15% / 0.15 jika komplit)
// Total ikan = 57
function getFishIndexLuck(unlockedCount, totalCount) {
    if (unlockedCount <= 0 || totalCount <= 0) return 0;
    if (unlockedCount >= totalCount) return 0.15; // 15% jika tamat
    
    // Bertahap:
    // >= 10 ikan  : +1%
    // >= 20 ikan  : +3%
    // >= 30 ikan  : +5%
    // >= 40 ikan  : +8%
    // >= 50 ikan  : +11%
    // >= 57 ikan  : +15%
    if (unlockedCount >= 50) return 0.11;
    if (unlockedCount >= 40) return 0.08;
    if (unlockedCount >= 30) return 0.05;
    if (unlockedCount >= 20) return 0.03;
    if (unlockedCount >= 10) return 0.01;
    return 0;
}

// Helper untuk mensinkronkan ikan yang sudah pernah didapat dari inventory ke fishIndex
function syncFishIndex(user) {
    if (!user.inventory) user.inventory = {};
    if (!Array.isArray(user.inventory.fishIndex)) {
        user.inventory.fishIndex = [];
    }

    const currentSet = new Set(user.inventory.fishIndex.map(name => name.toLowerCase()));
    
    // Cek semua item di inventory yang merupakan ikan
    for (const [itemName, count] of Object.entries(user.inventory)) {
        if (typeof count === 'number' && count > 0) {
            const matched = fishList.find(f => f.name.toLowerCase() === itemName.toLowerCase());
            if (matched && !currentSet.has(matched.name.toLowerCase())) {
                user.inventory.fishIndex.push(matched.name);
                currentSet.add(matched.name.toLowerCase());
            }
        }
    }
    return user.inventory.fishIndex;
}

async function handleFishIndex(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const unlockedList = syncFishIndex(user);
    saveUsers({ [sender]: user });

    const totalCount = fishList.length;
    const unlockedCount = unlockedList.length;
    const progressPercent = ((unlockedCount / totalCount) * 100).toFixed(1);
    const activeLuck = getFishIndexLuck(unlockedCount, totalCount);
    const activeLuckPercent = (activeLuck * 100).toFixed(0);

    const unlockedSet = new Set(unlockedList.map(name => name.toLowerCase()));

    // Kelompokkan ikan berdasarkan rarity
    const categories = [
        { key: "trash", title: "🪨 TRASH" },
        { key: "common", title: "🐟 COMMON" },
        { key: "uncommon", title: "🐡 UNCOMMON" },
        { key: "rare", title: "🦐 RARE" },
        { key: "epic", title: "🦞 EPIC" },
        { key: "legendary", title: "🦈 LEGENDARY" },
        { key: "mythic", title: "🐉 MYTHIC" },
        { key: "divine", title: "✨ DIVINE" }
    ];

    let text = `📖 *INDEX & ENSIKLOPEDIA IKAN* 📖\n`;
    text += `👤 Kolektor: *${user.name}*\n`;
    text += `📊 Progres: *${unlockedCount}/${totalCount}* (${progressPercent}%)\n`;
    text += `🍀 Bonus Luck Index: *+${activeLuckPercent}% Luck* ${unlockedCount >= totalCount ? '🌟 (MAX - SELESAI!)' : ''}\n\n`;

    text += `🎁 *Milestone Hadiah Luck:*\n`;
    text += `• 10 Ikan: +1% Luck ${unlockedCount >= 10 ? '✅' : '🔒'}\n`;
    text += `• 20 Ikan: +3% Luck ${unlockedCount >= 20 ? '✅' : '🔒'}\n`;
    text += `• 30 Ikan: +5% Luck ${unlockedCount >= 30 ? '✅' : '🔒'}\n`;
    text += `• 40 Ikan: +8% Luck ${unlockedCount >= 40 ? '✅' : '🔒'}\n`;
    text += `• 50 Ikan: +11% Luck ${unlockedCount >= 50 ? '✅' : '🔒'}\n`;
    text += `• 57 Ikan (Semua): *+15% Luck (MAX)* ${unlockedCount >= totalCount ? '✅' : '🔒'}\n\n`;

    categories.forEach(cat => {
        const catFishes = fishList.filter(f => f.rarity === cat.key);
        const unlockedInCat = catFishes.filter(f => unlockedSet.has(f.name.toLowerCase())).length;
        text += `${cat.title} (${unlockedInCat}/${catFishes.length})\n`;

        const fishEntries = catFishes.map(f => {
            if (unlockedSet.has(f.name.toLowerCase())) {
                return `✅ ${f.name}`;
            } else {
                return `❓ ???`;
            }
        });

        text += `${fishEntries.join('  •  ')}\n\n`;
    });

    text += `_Tips: Tangkap ikan baru dengan !mancing untuk membuka koleksi dan meningkatkan Luck!_`;

    return sock.sendMessage(from, { text: text.trim() }, { quoted: msg });
}

module.exports = {
    handleFishIndex,
    getFishIndexLuck,
    syncFishIndex
};
