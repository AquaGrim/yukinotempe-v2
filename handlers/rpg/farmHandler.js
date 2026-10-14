const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const seedList = require('../../data/seedData');

async function handleFarm(sock, msg, from, sender, args, forceCommand = null) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    
    // Inisialisasi ladang baru (versi multi-slot) jika belum ada
    if (!user.inventory.farms) {
        // Jika ada data ladang lama (farm tunggal), migrasi ke farms array
        if (user.inventory.farm) {
            user.inventory.farms = [user.inventory.farm];
            delete user.inventory.farm;
        } else {
            user.inventory.farms = [{ seedId: null, plantedAt: null, readyAt: null }];
        }
    }
    
    // Inisialisasi status level/slot ladang
    if (!user.inventory.farmLevel) user.inventory.farmLevel = 1;
    
    const farms = user.inventory.farms;
    const farmLevel = user.inventory.farmLevel;
    // forceCommand diisi saat dipanggil langsung dari !tanam atau !panen
    const command = forceCommand || (args[0] ? args[0].toLowerCase() : "info");

    if (command === "info") {
        let text = `🌱 *LADANG YUKINOTEMPE* 🌱\n⭐ Level Ladang: *${farmLevel}* (Kapasitas: ${farmLevel} petak)\n\n`;
        
        for (let i = 0; i < farms.length; i++) {
            const petak = farms[i];
            text += `*Petak ${i + 1}:* `;
            if (!petak.seedId) {
                text += "Kosong 🍂\n";
            } else {
                const seedData = seedList.find(s => s.id === petak.seedId);
                const now = Date.now();
                if (now >= petak.readyAt) {
                    text += `*${seedData.name}* (SIAP PANEN! 🌾)\n`;
                } else {
                    const remaining = Math.ceil((petak.readyAt - now) / (60 * 1000));
                    text += `*${seedData.name}* (Tumbuh: ${remaining} Menit ⏳)\n`;
                }
            }
        }
        
        text += "\n_Perintah: !tanam [bibit] | !panen | !ladang upgrade_";
        return sock.sendMessage(from, { text: text }, { quoted: msg });
    }

    if (command === "upgrade") {
        const nextLevel = farmLevel + 1;
        // Harga dasar 100k, naik 2x lipat setiap naik level
        // Lv1 -> Lv2 = 100,000 | Lv2 -> Lv3 = 200,000 | Lv3 -> Lv4 = 400,000 dst
        const upgradeCost = 100000 * Math.pow(2, farmLevel - 1);

        if (user.money < upgradeCost) {
            return sock.sendMessage(from, { text: `💸 *Uangmu tidak cukup!* 💸\n\nUntuk memperluas lahan ke Petak ${nextLevel}, kamu butuh *${upgradeCost.toLocaleString()} Gold*! (Uangmu: ${user.money.toLocaleString()})` }, { quoted: msg });
        }

        user.money -= upgradeCost;
        user.inventory.farmLevel = nextLevel;
        // Tambahkan petak kosong baru
        farms.push({ seedId: null, plantedAt: null, readyAt: null });
        
        saveUsers({ [sender]: user });
        
        return sock.sendMessage(from, { text: `🎉 *LADANG DIPERLUAS!* 🎉\n\nKamu telah membayar *${upgradeCost.toLocaleString()} Gold* untuk memperluas lahan pertanianmu.\nSekarang kamu punya *${nextLevel} Petak Ladang* yang bisa ditanami sekaligus! 🚜✨\n\nCek ladang barumu dengan *!ladang*` }, { quoted: msg });
    }
    
    if (command === "tanam") {
        // Cari petak kosong pertama
        const emptySlotIndex = farms.findIndex(f => f.seedId === null);
        
        if (emptySlotIndex === -1) {
            return sock.sendMessage(from, { text: `Semua petak ladangmu sudah penuh ditanami! 🥺\n_(Upgrade ladangmu dengan *!ladang upgrade* untuk nambah petak)_` }, { quoted: msg });
        }
        
        // Jika dipanggil langsung (!tanam gandum), args[0] sudah nama bibitnya
        // Jika dipanggil via !ladang tanam gandum, args[1] dst yang jadi nama bibit
        const seedQuery = (forceCommand ? args : args.slice(1)).join(" ").toLowerCase();
        if (!seedQuery) return sock.sendMessage(from, { text: 'Sebutkan nama bibit yang mau ditanam!\nContoh: *!tanam bibit gandum*' }, { quoted: msg });
        
        const targetSeed = seedList.find(s => s.name.toLowerCase().includes(seedQuery) || s.id.toLowerCase().includes(seedQuery));
        
        if (!targetSeed) return sock.sendMessage(from, { text: 'Bibit itu tidak ada di game ini! 🥺' }, { quoted: msg });
        
        const ownedCount = user.inventory[targetSeed.name] || 0;
        if (ownedCount < 1) return sock.sendMessage(from, { text: `Kamu tidak memiliki *${targetSeed.name}*! 🥺\n_(Dapatkan dari mancing atau petualang)_` }, { quoted: msg });
        
        // Kurangi bibit dari inventory
        user.inventory[targetSeed.name] -= 1;
        if (user.inventory[targetSeed.name] <= 0) delete user.inventory[targetSeed.name];
        
        // Buff Pet Pengurang Waktu Tanam Ladang (farmTimeReduction)
        let farmTimeReduction = 0; // dalam persentase (misal 0.15 = 15%)
        let petReductionText = "";
        if (user.inventory.activePet) {
            const petList = require('../../data/petData');
            const activePet = petList.find(p => p.id === user.inventory.activePet);
            if (activePet && activePet.bonus && activePet.bonus.farmTimeReduction) {
                farmTimeReduction = Math.min(0.80, activePet.bonus.farmTimeReduction); // batas maksimal reduksi 80%
                petReductionText = ` (Buff ${activePet.name}: -${Math.round(farmTimeReduction * 100)}% Waktu)`;
            }
        }

        const effectiveGrowTime = Math.max(60 * 1000, Math.floor(targetSeed.growTime * (1 - farmTimeReduction)));

        // Tanam di petak yang kosong
        const now = Date.now();
        farms[emptySlotIndex].seedId = targetSeed.id;
        farms[emptySlotIndex].plantedAt = now;
        farms[emptySlotIndex].readyAt = now + effectiveGrowTime;
        
        saveUsers({ [sender]: user });
        
        const hoursGrow = (effectiveGrowTime / (60 * 60 * 1000)).toFixed(1);
        return sock.sendMessage(from, { text: `🌱 Berhasil menanam *${targetSeed.name}* di *Petak ${emptySlotIndex + 1}*!\n\nTanamanmu butuh waktu sekitar *${hoursGrow} jam* untuk tumbuh${petReductionText}. Jangan lupa cek dengan *!ladang* atau *!farm* ya!` }, { quoted: msg });
    }
    
    if (command === "panen") {
        let harvestedAny = false;
        let totalHarvestInfo = {};
        const now = Date.now();
        
        for (let i = 0; i < farms.length; i++) {
            const petak = farms[i];
            if (petak.seedId && now >= petak.readyAt) {
                const seedData = seedList.find(s => s.id === petak.seedId);
                
                // Panen acak sesuai min max
                const baseHarvestAmount = Math.floor(Math.random() * (seedData.harvestMax - seedData.harvestMin + 1)) + seedData.harvestMin;
                
                // Buff Profesi Petani (Ekstra 1.5% Hasil Panen per level Job)
                let bonusHarvest = 0;
                if (user.inventory.job === 'petani') {
                    const jobLv = user.inventory.jobLevel || 1;
                    bonusHarvest = Math.floor(baseHarvestAmount * (jobLv * 1.5 / 100));
                }

                // Buff Pet Ladang (Hasil Panen ekstra dari Pet aktif)
                let petFarmBonus = 0;
                if (user.inventory.activePet) {
                    const petList = require('../../data/petData');
                    const activePet = petList.find(p => p.id === user.inventory.activePet);
                    if (activePet && activePet.bonus && activePet.bonus.farmLuck) {
                        petFarmBonus = Math.floor(baseHarvestAmount * activePet.bonus.farmLuck);
                    }
                }

                const harvestAmount = baseHarvestAmount + bonusHarvest + petFarmBonus;
                
                // Masukkan hasil ke inventory
                user.inventory[seedData.harvestItemId] = (user.inventory[seedData.harvestItemId] || 0) + harvestAmount;
                
                // Kumpulkan log panen
                totalHarvestInfo[seedData.harvestItemId] = (totalHarvestInfo[seedData.harvestItemId] || 0) + harvestAmount;
                
                // Reset ladang (petak ini kosong kembali)
                petak.seedId = null;
                petak.plantedAt = null;
                petak.readyAt = null;
                harvestedAny = true;
            }
        }
        
        if (!harvestedAny) {
            return sock.sendMessage(from, { text: 'Belum ada tanaman yang siap dipanen saat ini! 🥺 Cek waktunya di *!ladang*' }, { quoted: msg });
        }
        
        saveUsers({ [sender]: user });
        
        let resultText = `🌾 *PANEN BERHASIL!* 🌾\n\nKamu telah memanen hasil ladangmu dan mendapatkan:\n`;
        for (const [itemName, amount] of Object.entries(totalHarvestInfo)) {
            resultText += `📦 *${amount}x ${itemName}*\n`;
        }
        
        // === JOB SYSTEM EXP ===
        const { addJobExp } = require('../../utils/jobHelper');
        // Petani dapat 30 EXP per panen
        const jobResult = addJobExp(sender, "petani", 30);
        if (jobResult.leveledUp) {
            resultText += `\n🎓 *PROFESI NAIK LEVEL!* Kemampuan Bertanimu kini Lv.${jobResult.newLevel}!`;
        }

        resultText += `\n\n_(Hasil panen bisa kamu jual di !jual atau disimpan)_`;
        
        return sock.sendMessage(from, { text: resultText }, { quoted: msg });
    }
}

module.exports = { handleFarm };