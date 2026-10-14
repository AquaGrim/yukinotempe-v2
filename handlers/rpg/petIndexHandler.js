const petList = require('../../data/petData');
const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

// Menghitung bonus luck buka pet box dari index pet (bertahap sampai total 20% / 0.20 jika komplit)
// Total pet = 21
function getPetIndexLuck(unlockedCount, totalCount) {
    if (unlockedCount <= 0 || totalCount <= 0) return 0;
    if (unlockedCount >= totalCount) return 0.20; // 20% jika tamat (semua pet)
    
    // Bertahap:
    // >= 3 pet   : +2% (0.02)
    // >= 6 pet   : +5% (0.05)
    // >= 10 pet  : +9% (0.09)
    // >= 14 pet  : +13% (0.13)
    // >= 18 pet  : +16% (0.16)
    // >= 21 pet  : +20% (0.20 - MAX)
    if (unlockedCount >= 18) return 0.16;
    if (unlockedCount >= 14) return 0.13;
    if (unlockedCount >= 10) return 0.09;
    if (unlockedCount >= 6) return 0.05;
    if (unlockedCount >= 3) return 0.02;
    return 0;
}

// Sinkronkan pet yang dimiliki user ke petIndex
function syncPetIndex(user) {
    if (!user.inventory) user.inventory = {};
    if (!Array.isArray(user.inventory.petIndex)) {
        user.inventory.petIndex = [];
    }

    const currentSet = new Set(user.inventory.petIndex.map(id => id.toLowerCase()));

    // Cek semua pet yang dimiliki di user.inventory.pets
    if (Array.isArray(user.inventory.pets)) {
        for (const petId of user.inventory.pets) {
            const matched = petList.find(p => p.id.toLowerCase() === petId.toLowerCase());
            if (matched && !currentSet.has(matched.id.toLowerCase())) {
                user.inventory.petIndex.push(matched.id);
                currentSet.add(matched.id.toLowerCase());
            }
        }
    }

    return user.inventory.petIndex;
}

async function handlePetIndex(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const unlockedList = syncPetIndex(user);
    saveUsers({ [sender]: user });

    const totalCount = petList.length;
    const unlockedCount = unlockedList.length;
    const progressPercent = ((unlockedCount / totalCount) * 100).toFixed(1);
    const activeLuck = getPetIndexLuck(unlockedCount, totalCount);
    const activeLuckPercent = (activeLuck * 100).toFixed(0);

    const unlockedSet = new Set(unlockedList.map(id => id.toLowerCase()));

    const categories = [
        { key: "common", title: "🟢 COMMON" },
        { key: "rare", title: "🔵 RARE" },
        { key: "epic", title: "🟣 EPIC" },
        { key: "legendary", title: "🟡 LEGENDARY" },
        { key: "mythic", title: "🔴 MYTHIC" }
    ];

    let text = `📖 *INDEX & ENSIKLOPEDIA PET* 🐾\n`;
    text += `👤 Kolektor: *${user.name}*\n`;
    text += `📊 Progres: *${unlockedCount}/${totalCount}* (${progressPercent}%)\n`;
    text += `🎁 Bonus Luck Box Pet: *+${activeLuckPercent}% Luck Gacha* ${unlockedCount >= totalCount ? '🌟 (MAX - SELESAI!)' : ''}\n\n`;

    text += `🎯 *Milestone Hadiah Luck Box:*\n`;
    text += `• 3 Pet: +2% Luck Box ${unlockedCount >= 3 ? '✅' : '🔒'}\n`;
    text += `• 6 Pet: +5% Luck Box ${unlockedCount >= 6 ? '✅' : '🔒'}\n`;
    text += `• 10 Pet: +9% Luck Box ${unlockedCount >= 10 ? '✅' : '🔒'}\n`;
    text += `• 14 Pet: +13% Luck Box ${unlockedCount >= 14 ? '✅' : '🔒'}\n`;
    text += `• 18 Pet: +16% Luck Box ${unlockedCount >= 18 ? '✅' : '🔒'}\n`;
    text += `• ${totalCount} Pet (Semua): *+20% Luck Box (MAX)* ${unlockedCount >= totalCount ? '✅' : '🔒'}\n\n`;

    categories.forEach(cat => {
        const catPets = petList.filter(p => p.rarity === cat.key);
        const unlockedInCat = catPets.filter(p => unlockedSet.has(p.id.toLowerCase())).length;
        text += `${cat.title} (${unlockedInCat}/${catPets.length})\n`;

        const petEntries = catPets.map(p => {
            if (unlockedSet.has(p.id.toLowerCase())) {
                return `✅ ${p.name}`;
            } else {
                return `❓ ???`;
            }
        });

        text += `${petEntries.join('  •  ')}\n\n`;
    });

    text += `_Tips: Beli Mystery Pet Box di !shop atau temukan di !petualang untuk melengkapi index dan meningkatkan peluang dapat Pet Langka!_`;

    return sock.sendMessage(from, { text: text.trim() }, { quoted: msg });
}

module.exports = {
    handlePetIndex,
    getPetIndexLuck,
    syncPetIndex
};
