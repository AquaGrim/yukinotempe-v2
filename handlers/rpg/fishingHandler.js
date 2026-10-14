const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');
const { checkActiveEvent } = require('../../utils/eventHelper');
const fishList = require('../../data/fishData');
const { getFishIndexLuck, syncFishIndex } = require('./fishIndexHandler');

const FISHING_TIME = 60 * 1000; // 1 menit

// Variabel untuk melacak status memancing sementara di dalam memori saat bot berjalan
const activeFishingSessions = new Set();

// Fungsi untuk menghapus paksa status nyangkut (opsional bisa dipanggil admin)
function clearFishingSession(sender) {
    if (activeFishingSessions.has(sender)) {
        activeFishingSessions.delete(sender);
        return true;
    }
    return false;
}

async function handleFishing(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const activeEvent = checkActiveEvent();
    const luckMultiplier = activeEvent.active ? activeEvent.luckMultiplier : 1;
    const usersMap = { [sender]: user }; 
    
    if (activeFishingSessions.has(sender)) {
        return sock.sendMessage(from, { text: 'Kamu masih menunggu ikan memakan umpanmu! Sabar ya 🎣' }, { quoted: msg });
    }

    // Pengaturan durasi dasar mancing
    let fishingTime = 60 * 1000;
    let rodTimeBonus = 0;
    let usedRodText = "";

    // Hitung Buff dari Pet Aktif
    let petFishingLuck = 0;
    let petTimeReduction = 0;
    let petGoldBonus = 0;
    let activePetName = "";
    const petList = require('../../data/petData');
    if (user.inventory.activePet) {
        const activePetData = petList.find(p => p.id === user.inventory.activePet);
        if (activePetData) {
            petFishingLuck = activePetData.bonus.fishingLuck || activePetData.bonus.luck || 0;
            petTimeReduction = (activePetData.bonus.fishTimeReduction || 0) * 1000;
            petGoldBonus = activePetData.bonus.gold || 0;
            activePetName = activePetData.name;
        }
    }
    
    // Hitung bonus Rod (Diselaraskan: Mythic -30s, Golden -22s, Iron -14s, Wooden -7s)
    let rodLuckBonus = 0;
    if (user.inventory["Mythic Rod"]) {
        rodTimeBonus = 30 * 1000; // -30 detik
        rodLuckBonus = 0.25;
        usedRodText = `🎣 Memakai *Mythic Rod*! (+25% Luck & durasi -30d)\n`;
    } else if (user.inventory["Golden Rod"]) {
        rodTimeBonus = 22 * 1000; // -22 detik
        rodLuckBonus = 0.15;
        usedRodText = `🎣 Memakai *Golden Rod*! (+15% Luck & durasi -22d)\n`;
    } else if (user.inventory["Iron Rod"]) {
        rodTimeBonus = 14 * 1000; // -14 detik
        rodLuckBonus = 0.08;
        usedRodText = `🎣 Memakai *Iron Rod*! (+8% Luck & durasi -14d)\n`;
    } else if (user.inventory["Wooden Rod"]) {
        rodTimeBonus = 7 * 1000; // -7 detik
        rodLuckBonus = 0.03;
        usedRodText = `🎣 Memakai *Wooden Rod*! (+3% Luck & durasi -7d)\n`;
    }

    fishingTime -= rodTimeBonus;
    fishingTime -= petTimeReduction;

    // Cek item Lure (pengurang waktu)
    let usedLure = null;
    if (user.inventory["Mythic Lure"] > 0) { 
        fishingTime -= 25 * 1000; 
        usedLure = "Mythic Lure"; 
        user.inventory["Mythic Lure"]--; 
        if (user.inventory["Mythic Lure"] <= 0) delete user.inventory["Mythic Lure"];
    } else if (user.inventory["Epic Lure"] > 0) { 
        fishingTime -= 18 * 1000; 
        usedLure = "Epic Lure"; 
        user.inventory["Epic Lure"]--; 
        if (user.inventory["Epic Lure"] <= 0) delete user.inventory["Epic Lure"];
    } else if (user.inventory["Rare Lure"] > 0) { 
        fishingTime -= 12 * 1000; 
        usedLure = "Rare Lure"; 
        user.inventory["Rare Lure"]--; 
        if (user.inventory["Rare Lure"] <= 0) delete user.inventory["Rare Lure"];
    } else if (user.inventory["Common Lure"] > 0) { 
        fishingTime -= 6 * 1000; 
        usedLure = "Common Lure"; 
        user.inventory["Common Lure"]--; 
        if (user.inventory["Common Lure"] <= 0) delete user.inventory["Common Lure"];
    }

    // Pastikan durasi tidak sampai minus (Batas minimum tetap di 5 detik)
    if (fishingTime < 5000) fishingTime = 5000;

    // Cek item Net (multi ikan)
    let catchCount = 1;
    let usedNet = null;
    if (user.inventory["Mythic Net"] > 0) { 
        catchCount = 5; 
        usedNet = "Mythic Net"; 
        user.inventory["Mythic Net"]--; 
        if (user.inventory["Mythic Net"] <= 0) delete user.inventory["Mythic Net"];
    } else if (user.inventory["Epic Net"] > 0) { 
        catchCount = 4; 
        usedNet = "Epic Net"; 
        user.inventory["Epic Net"]--; 
        if (user.inventory["Epic Net"] <= 0) delete user.inventory["Epic Net"];
    } else if (user.inventory["Rare Net"] > 0) { 
        catchCount = 3; 
        usedNet = "Rare Net"; 
        user.inventory["Rare Net"]--; 
        if (user.inventory["Rare Net"] <= 0) delete user.inventory["Rare Net"];
    } else if (user.inventory["Common Net"] > 0) { 
        catchCount = 2; 
        usedNet = "Common Net"; 
        user.inventory["Common Net"]--; 
        if (user.inventory["Common Net"] <= 0) delete user.inventory["Common Net"];
    }

    // Tandai sesi memancing aktif di memori (tidak mengkonsumsi stamina lagi)
    saveUsers(usersMap);
    
    activeFishingSessions.add(sender);

    // Hitung Luck saat ini (Total Dasar: Rod + Pet + Index, lalu dikalikan Event Multiplier jika ada)
    const currentUnlockedFishes = syncFishIndex(user);
    const currentIndexLuck = getFishIndexLuck(currentUnlockedFishes.length, fishList.length);
    const petLuckVal = petFishingLuck;
    const baseTotalLuck = rodLuckBonus + petLuckVal + currentIndexLuck;
    const totalEffectiveLuck = baseTotalLuck * luckMultiplier;
    const totalLuckPercent = (totalEffectiveLuck * 100).toFixed(1);

    // Detail breakdown luck
    let luckBreakdown = [];
    if (rodLuckBonus > 0) luckBreakdown.push(`Rod: +${(rodLuckBonus * 100).toFixed(0)}%`);
    if (petLuckVal > 0) luckBreakdown.push(`Pet: +${(petLuckVal * 100).toFixed(0)}%`);
    if (currentIndexLuck > 0) luckBreakdown.push(`Index: +${(currentIndexLuck * 100).toFixed(0)}%`);
    if (luckMultiplier > 1) luckBreakdown.push(`Event: x${luckMultiplier}`);

    let startText = `Kamu melemparkan kail ke air... 🎣\n\n`;
    
    // Tampilkan notifikasi pancingan yang digunakan
    if (usedRodText) startText += usedRodText;
    if (petTimeReduction > 0) startText += `🐾 *${activePetName}* memangkas waktu mancing -${petTimeReduction / 1000}d!\n`;
    
    if (usedLure) startText += `🪀 Memakai *${usedLure}*! Waktu dikurangi lebih lanjut.\n`;
    startText += `⏳ Waktu mancingmu: *${fishingTime / 1000} detik*.\n`;
    
    if (usedNet) startText += `🕸️ Memakai *${usedNet}*! Bisa menangkap hingga *${catchCount} ikan*.\n`;
    startText += `🍀 Total Luck Sekarang: *+${totalLuckPercent}%* ${luckBreakdown.length > 0 ? `_(${luckBreakdown.join(', ')})_` : ''}\n`;

    await sock.sendMessage(from, { text: startText.trim() }, { quoted: msg });

    // Gunakan setTimeout untuk mengeksekusi hasil secara otomatis
    setTimeout(async () => {
        try {
            // Kita fetch data user terbaru lagi agar tidak menimpa data baru
            const updatedUser = getUser(sender);
            
            let caughtFishes = [];
            let totalExp = 0;
            let totalGoldValue = 0;

            // Ambil index ikan dan sinkronkan dengan database/inventory
            const unlockedFishes = syncFishIndex(updatedUser);
            const indexLuck = getFishIndexLuck(unlockedFishes.length, fishList.length);

            let newIndexNotif = [];

            for (let i = 0; i < catchCount; i++) {
                // Modifikasi rarity chance berdasarkan pancingan (Rod) - NERFED & BALANCED
                let chanceBonus = 0;
                if (updatedUser.inventory["Mythic Rod"]) chanceBonus = 0.25;      // Sebelumnya 0.70 (Nerf drastis)
                else if (updatedUser.inventory["Golden Rod"]) chanceBonus = 0.15; // Sebelumnya 0.35
                else if (updatedUser.inventory["Iron Rod"]) chanceBonus = 0.08;   // Sebelumnya 0.15
                else if (updatedUser.inventory["Wooden Rod"]) chanceBonus = 0.03; // Sebelumnya 0.05
                
                // Total Luck Dasar dikalikan Event Multiplier
                const baseLuck = rodLuckBonus + petFishingLuck + indexLuck;
                const totalEffectiveLuck = baseLuck * luckMultiplier;
                
                // Gunakan totalEffectiveLuck sebagai chanceBonus
                chanceBonus = totalEffectiveLuck;

                // Probabilitas Rarity Ikan:
                // Sesuai instruksi:
                // - Semua tier di bawah Rare (Trash, Common, Uncommon) BISA MENYUSUT jika ada luck multiplier!
                // - Rare dibuat FLAT / penyeimbang.
                // - Yang DI-BOOST oleh Luck: Epic, Legendary, Mythic, dan Divine!
                const rarityPool = [
                    { rarity: "trash", chance: Math.max(0.08, 0.25 - (chanceBonus * 0.15)) },    // Menyusut saat luck naik
                    { rarity: "common", chance: Math.max(0.15, 0.40 - (chanceBonus * 0.20)) },   // Menyusut saat luck naik
                    { rarity: "uncommon", chance: Math.max(0.10, 0.20 - (chanceBonus * 0.10)) }, // Menyusut saat luck naik
                    { rarity: "rare", chance: 0.08 },                                            // Flat
                    { rarity: "epic", chance: 0.015 + (chanceBonus * 0.04) },                    // Di-boost oleh Total Luck
                    { rarity: "legendary", chance: 0.004 + (chanceBonus * 0.01) },               // Di-boost oleh Total Luck
                    { rarity: "mythic", chance: 0.0004 + (chanceBonus * 0.002) },                // Di-boost oleh Total Luck
                    { rarity: "divine", chance: 0.00003 + (chanceBonus * 0.0003) }               // Di-boost oleh Total Luck
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
                
                // Deteksi jika ikan baru pertama kali tertangkap (belum ada di index)
                const isNewIndex = !updatedUser.inventory.fishIndex || !updatedUser.inventory.fishIndex.some(f => f.toLowerCase() === selectedFish.name.toLowerCase());
                if (isNewIndex) {
                    if (!updatedUser.inventory.fishIndex) updatedUser.inventory.fishIndex = [];
                    updatedUser.inventory.fishIndex.push(selectedFish.name);
                    newIndexNotif.push(`✨ *NEW ENTRY:* ${selectedFish.name} masuk ke !index!`);
                }

                caughtFishes.push(`*${selectedFish.name}* (${selectedRarity.toUpperCase()})`);
                totalExp += 15;
                
                // Bonus jual dari Pet
                const goldValue = Math.floor(selectedFish.price * (1 + petGoldBonus));
                totalGoldValue += goldValue;
                
                updatedUser.inventory[selectedFish.name] = (updatedUser.inventory[selectedFish.name] || 0) + 1;
            }
            
            // Gacha Drop Bibit (Farming) saat Mancing (Peluang 5% + Luck Pet)
            let seedDropMsg = "";
            if (Math.random() < (0.05 + petFishingLuck)) {
                const seedList = require('../../data/seedData');
                // Bisa drop SEMUA bibit
                const dropSeed = seedList[Math.floor(Math.random() * seedList.length)];
                updatedUser.inventory[dropSeed.name] = (updatedUser.inventory[dropSeed.name] || 0) + 1;
                seedDropMsg = `\n🌱 *Hoki!* Kailmu tersangkut akar dan menarik *1x ${dropSeed.name}*! (Gunakan !tanam)\n`;
            }

            const updatedUsersMap = { [sender]: updatedUser };
            saveUsers(updatedUsersMap);
            
            // Tambahkan EXP menggunakan fungsi bawaan leveling (ini akan menyimpan ulang database dengan exp terbaru)
            const levelUpLevel = addExp(sender, totalExp);

            activeFishingSessions.delete(sender);

            // === JOB SYSTEM EXP ===
            const { addJobExp } = require('../../utils/jobHelper');
            let jobExpText = "";
            const jobResult = addJobExp(sender, "nelayan", 50); // Mancing dapet +50 Job EXP
            if (jobResult.leveledUp) {
                jobExpText = `\n🎓 *PROFESI NAIK LEVEL!* Kemampuan Nelayanmu kini Lv.${jobResult.newLevel}!`;
            }

            let replyText = `🎣 *IKAN TERANGKAP!* 🎣\n👤 Pemancing: *${updatedUser.name}*\n\n` +
                            `Horeee! Kailmu berhasil diangkat, dan kamu mendapatkan:\n` +
                            caughtFishes.map(f => `- ${f}`).join('\n') + `\n` +
                            (newIndexNotif.length > 0 ? `\n` + newIndexNotif.join('\n') + `\n` : ``) +
                            seedDropMsg + `\n` +
                            `✨ *+${totalExp} EXP*\n` +
                            `(Total nilai tangkapan: ${totalGoldValue} Gold)` + jobExpText;

            if (levelUpLevel !== false) {
                replyText += `\n\n🎉 SELAMAT! Kamu naik ke Level ${levelUpLevel}! (+${levelUpLevel * 50} Gold)`;
            }

            await sock.sendMessage(from, { text: replyText }, { quoted: msg });

        } catch (err) {
            console.error('[ERROR] Otomatisasi Mancing Gagal:', err);
            activeFishingSessions.delete(sender);
            await sock.sendMessage(from, { text: 'Aduh! Kailmu tersangkut sesuatu dan putus! 😭 (Error System)' }, { quoted: msg });
        }
    }, fishingTime);
}

module.exports = {
    handleFishing
};
