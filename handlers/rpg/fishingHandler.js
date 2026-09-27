const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');
const fishList = require('../../data/fishData');

const FISHING_TIME = 60 * 1000; // 1 menit

// Variabel untuk melacak status memancing sementara di dalam memori saat bot berjalan
const activeFishingSessions = new Set();

async function handleFishing(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const usersMap = { [sender]: user }; 
    
    if (activeFishingSessions.has(sender)) {
        return sock.sendMessage(from, { text: 'Kamu masih menunggu ikan memakan umpanmu! Sabar ya 🎣' }, { quoted: msg });
    }

    // Pengaturan durasi dasar mancing
    let fishingTime = 60 * 1000;
    let rodTimeBonus = 0;
    let usedRodText = "";

    if (user.inventory["Mythic Rod"]) {
        rodTimeBonus = 40 * 1000; // -40 detik
        usedRodText = `🎣 Memakai *Mythic Rod*! (Peluang ikan dewa naik drastis & lebih cepat -40d)\n`;
    } else if (user.inventory["Golden Rod"]) {
        rodTimeBonus = 30 * 1000; // -30 detik
        usedRodText = `🎣 Memakai *Golden Rod*! (Peluang ikan bagus naik & lebih cepat -30d)\n`;
    } else if (user.inventory["Iron Rod"]) {
        rodTimeBonus = 20 * 1000; // -20 detik
        usedRodText = `🎣 Memakai *Iron Rod*! (Peluang ikan bagus sedikit naik & lebih cepat -20d)\n`;
    } else if (user.inventory["Wooden Rod"]) {
        rodTimeBonus = 10 * 1000; // -10 detik
        usedRodText = `🎣 Memakai *Wooden Rod*! (Pancingan standar & lebih cepat -10d)\n`;
    }

    fishingTime -= rodTimeBonus;

    // Pastikan durasi tidak sampai minus (Paling cepat dibatasi 5 detik)
    if (fishingTime < 5000) fishingTime = 5000;

    // Karena umpan/jaring sudah dicabut dari toko, kita bisa membersihkan variabel umpan 
    // jika kamu nggak mau item itu berfungsi lagi walau player lama masih punya sisanya.
    // Tapi kita biarkan saja jika ada yang masih menyimpannya.
    let usedLure = null;
    let catchCount = 1;
    let usedNet = null;

    // Tandai sesi memancing aktif di memori (tidak mengkonsumsi stamina lagi)
    saveUsers(usersMap);
    
    activeFishingSessions.add(sender);

    let startText = `Kamu melemparkan kail ke air... 🎣\n\n`;
    
    // Tampilkan notifikasi pancingan yang digunakan
    if (usedRodText) startText += usedRodText;
    
    startText += `Waktu mancingmu: *${fishingTime / 1000} detik*.\n`;
    
    if (usedNet) startText += `🕸️ Memakai sisa *${usedNet}*! Bisa menangkap hingga *${catchCount} ikan*.\n`;

    await sock.sendMessage(from, { text: startText.trim() }, { quoted: msg });

    // Gunakan setTimeout untuk mengeksekusi hasil secara otomatis
    setTimeout(async () => {
        try {
            // Kita fetch data user terbaru lagi agar tidak menimpa data baru
            const updatedUser = getUser(sender);
            const updatedUsersMap = { [sender]: updatedUser };
            
            let caughtFishes = [];
            let totalExp = 0;
            let totalGoldValue = 0;

            for (let i = 0; i < catchCount; i++) {
                // Modifikasi rarity chance berdasarkan pancingan (Rod)
                let chanceBonus = 0;
                if (updatedUser.inventory["Mythic Rod"]) chanceBonus = 0.70;
                else if (updatedUser.inventory["Golden Rod"]) chanceBonus = 0.35;
                else if (updatedUser.inventory["Iron Rod"]) chanceBonus = 0.15;
                else if (updatedUser.inventory["Wooden Rod"]) chanceBonus = 0.05;

                const rarityPool = [
                    { rarity: "trash", chance: Math.max(0, 0.25 - (chanceBonus * 0.5)) },
                    { rarity: "common", chance: Math.max(0, 0.35 - (chanceBonus * 0.3)) },
                    { rarity: "uncommon", chance: 0.2 },
                    { rarity: "rare", chance: 0.16 + (chanceBonus * 0.2) },
                    { rarity: "epic", chance: 0.02 + (chanceBonus * 0.3) },
                    { rarity: "legendary", chance: 0.009 + (chanceBonus * 0.2) },
                    { rarity: "mythic", chance: 0.001 + (chanceBonus * 0.1) },
                ];
                
                // Normalisasi probabilitas supaya totalnya pas 1.0 (100%)
                let totalChance = rarityPool.reduce((sum, item) => sum + item.chance, 0);
                
                const rand = Math.random() * totalChance;
                let selectedRarity = "trash";
                let acc = 0;
                
                for (const entry of rarityPool) {
                    acc += entry.chance;
                    if (rand <= acc) {
                        selectedRarity = entry.rarity;
                        break;
                    }
                }
                
                const candidates = fishList.filter((f) => f.rarity === selectedRarity);
                const selectedFish = candidates[Math.floor(Math.random() * candidates.length)];
                
                caughtFishes.push(`*${selectedFish.name}* (${selectedRarity.toUpperCase()})`);
                totalExp += 15;
                totalGoldValue += selectedFish.price;
                
                updatedUser.inventory[selectedFish.name] = (updatedUser.inventory[selectedFish.name] || 0) + 1;
            }

            saveUsers(updatedUsersMap);

            activeFishingSessions.delete(sender);

            const levelUpMsg = addExp(sender, totalExp);

            let replyText = `🎣 *IKAN TERANGKAP!* 🎣\n👤 Pemancing: *${updatedUser.name}*\n\n` +
                            `Horeee! Kailmu berhasil diangkat, dan kamu mendapatkan:\n` +
                            caughtFishes.map(f => `- ${f}`).join('\n') + `\n\n` +
                            `✨ *+${totalExp} EXP*\n` +
                            `(Total nilai tangkapan: ${totalGoldValue} Gold)`;

            if (levelUpMsg) replyText += `\n\n🎉 ${levelUpMsg}`;

            await sock.sendMessage(from, { text: replyText }, { quoted: msg });

        } catch (err) {
            console.error('[ERROR] Otomatisasi Mancing Gagal:', err);
            activeFishingSessions.delete(sender);
        }
    }, fishingTime);
}

module.exports = {
    handleFishing
};
