const fs = require('fs');

try {
    // ADVENTURE HANDLER
    let adv = fs.readFileSync('handlers/rpg/adventureHandler.js', 'utf8');
    const advOld = '    if (levelUpMsg) replyText += `\\n\\n🎉 ${levelUpMsg}`;';
    const advNew = `    // Drop Lure (Memangkas Waktu Mancing)
    const lureRand = Math.random();
    if (lureRand < 0.02) {
        user.inventory["Mythic Lure"] = (user.inventory["Mythic Lure"] || 0) + 1;
        replyText += \`\\n🌟 *DAPAT MYTHIC LURE! (-45 detik mancing)*\`;
    } else if (lureRand < 0.08) {
        user.inventory["Epic Lure"] = (user.inventory["Epic Lure"] || 0) + 1;
        replyText += \`\\n🪀 *DAPAT EPIC LURE! (-30 detik mancing)*\`;
    } else if (lureRand < 0.15) {
        user.inventory["Rare Lure"] = (user.inventory["Rare Lure"] || 0) + 1;
        replyText += \`\\n✨ *DAPAT RARE LURE! (-20 detik mancing)*\`;
    } else if (lureRand < 0.3) {
        user.inventory["Common Lure"] = (user.inventory["Common Lure"] || 0) + 1;
        replyText += \`\\n🎣 *DAPAT COMMON LURE! (-10 detik mancing)*\`;
    }

    // Drop Net (Menangkap Ikan Lebih Banyak)
    const netRand = Math.random();
    if (netRand < 0.02) {
        user.inventory["Mythic Net"] = (user.inventory["Mythic Net"] || 0) + 1;
        replyText += \`\\n🕸️🌟 *DAPAT MYTHIC NET! (Max 5 Ikan)*\`;
    } else if (netRand < 0.08) {
        user.inventory["Epic Net"] = (user.inventory["Epic Net"] || 0) + 1;
        replyText += \`\\n🕸️ *DAPAT EPIC NET! (Max 4 Ikan)*\`;
    } else if (netRand < 0.15) {
        user.inventory["Rare Net"] = (user.inventory["Rare Net"] || 0) + 1;
        replyText += \`\\n🕸️ *DAPAT RARE NET! (Max 3 Ikan)*\`;
    } else if (netRand < 0.3) {
        user.inventory["Common Net"] = (user.inventory["Common Net"] || 0) + 1;
        replyText += \`\\n🕸️ *DAPAT COMMON NET! (Max 2 Ikan)*\`;
    }

    if (levelUpMsg) replyText += \`\\n\\n🎉 \${levelUpMsg}\`;`;
    adv = adv.replace(advOld, advNew);
    fs.writeFileSync('handlers/rpg/adventureHandler.js', adv);

    // FISHING HANDLER
    let fish = fs.readFileSync('handlers/rpg/fishingHandler.js', 'utf8');

    const fishOld1 = `    // Kurangi stamina dan tandai sesi memancing aktif di memori
    user.stamina -= 1;
    user.inventory.stamina = user.stamina; 
    saveUsers(usersMap);
    
    activeFishingSessions.add(sender);

    await sock.sendMessage(from, { text: \`Kamu melemparkan kail ke air... 🎣\\n\\nTunggu sekitar *1 menit*, bot akan otomatis memberitahu jika ada ikan yang tertangkap!\` }, { quoted: msg });`;

    const fishNew1 = `    // Cek item Lure (pengurang waktu)
    let fishingTime = 60 * 1000;
    let usedLure = null;
    if (user.inventory["Mythic Lure"] > 0) { fishingTime = 15 * 1000; usedLure = "Mythic Lure"; user.inventory["Mythic Lure"]--; }
    else if (user.inventory["Epic Lure"] > 0) { fishingTime = 30 * 1000; usedLure = "Epic Lure"; user.inventory["Epic Lure"]--; }
    else if (user.inventory["Rare Lure"] > 0) { fishingTime = 40 * 1000; usedLure = "Rare Lure"; user.inventory["Rare Lure"]--; }
    else if (user.inventory["Common Lure"] > 0) { fishingTime = 50 * 1000; usedLure = "Common Lure"; user.inventory["Common Lure"]--; }

    // Cek item Net (multi ikan)
    let catchCount = 1;
    let usedNet = null;
    if (user.inventory["Mythic Net"] > 0) { catchCount = 5; usedNet = "Mythic Net"; user.inventory["Mythic Net"]--; }
    else if (user.inventory["Epic Net"] > 0) { catchCount = 4; usedNet = "Epic Net"; user.inventory["Epic Net"]--; }
    else if (user.inventory["Rare Net"] > 0) { catchCount = 3; usedNet = "Rare Net"; user.inventory["Rare Net"]--; }
    else if (user.inventory["Common Net"] > 0) { catchCount = 2; usedNet = "Common Net"; user.inventory["Common Net"]--; }

    // Kurangi stamina dan tandai sesi memancing aktif di memori
    user.stamina -= 1;
    user.inventory.stamina = user.stamina; 
    saveUsers(usersMap);
    
    activeFishingSessions.add(sender);

    let startText = \`Kamu melemparkan kail ke air... 🎣\\n\\n\`;
    if (usedLure) startText += \`🪀 Memakai *\${usedLure}*! Waktu mancing jadi *\${fishingTime / 1000} detik*.\\n\`;
    if (usedNet) startText += \`🕸️ Memakai *\${usedNet}*! Bisa menangkap hingga *\${catchCount} ikan*.\\n\`;
    if (!usedLure && !usedNet) startText += \`Tunggu sekitar *1 menit*, bot akan otomatis memberitahu jika ada ikan yang tertangkap!\\n\`;

    await sock.sendMessage(from, { text: startText.trim() }, { quoted: msg });`;

    fish = fish.replace(fishOld1, fishNew1);

    const fishOld2Regex = /\/\/ Gacha Rarity Ikan[\s\S]*?await sock\.sendMessage\(from, \{ text: replyText \}, \{ quoted: msg \}\);/;

    const fishNew2 = `let caughtFishes = [];
            let totalExp = 0;
            let totalGoldValue = 0;

            for (let i = 0; i < catchCount; i++) {
                const rarityPool = [
                    { rarity: "trash", chance: 0.25 },
                    { rarity: "common", chance: 0.35 },
                    { rarity: "uncommon", chance: 0.2 },
                    { rarity: "rare", chance: 0.16 },
                    { rarity: "epic", chance: 0.02 },
                    { rarity: "legendary", chance: 0.009 },
                    { rarity: "mythic", chance: 0.001 },
                ];
                
                const rand = Math.random();
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
                
                caughtFishes.push(\`*\${selectedFish.name}* (\${selectedRarity.toUpperCase()})\`);
                totalExp += 15;
                totalGoldValue += selectedFish.price;
                
                updatedUser.inventory[selectedFish.name] = (updatedUser.inventory[selectedFish.name] || 0) + 1;
            }

            saveUsers(updatedUsersMap);

            activeFishingSessions.delete(sender);

            const levelUpMsg = addExp(sender, totalExp);

            let replyText = \`🎣 *IKAN TERANGKAP!* 🎣\\n👤 Pemancing: *\${updatedUser.name}*\\n\\n\` +
                            \`Horeee! Kailmu berhasil diangkat, dan kamu mendapatkan:\\n\` +
                            caughtFishes.map(f => \`- \${f}\`).join('\\n') + \`\\n\\n\` +
                            \`✨ *+\${totalExp} EXP*\\n\` +
                            \`(Total nilai tangkapan: \${totalGoldValue} Gold)\`;

            if (levelUpMsg) replyText += \`\\n\\n🎉 \${levelUpMsg}\`;

            await sock.sendMessage(from, { text: replyText }, { quoted: msg });`;

    fish = fish.replace(fishOld2Regex, fishNew2);
    fish = fish.replace('}, FISHING_TIME);', '}, fishingTime);');
    
    fs.writeFileSync('handlers/rpg/fishingHandler.js', fish);
    console.log("SUCCESS");
} catch(e) {
    console.error(e);
}