const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');
const petList = require('../../data/petData');

const ADVENTURE_COOLDOWN = 1 * 60 * 1000; // 1 Menit

async function handleAdventure(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    const usersMap = { [sender]: user };

    if (user.stamina === undefined) user.stamina = user.maxStamina || 10;

    const now = Date.now();
    const lastAdv = user.inventory.lastAdventure || 0;

    if (now - lastAdv < ADVENTURE_COOLDOWN) {
        const remaining = Math.ceil((ADVENTURE_COOLDOWN - (now - lastAdv)) / 1000);
        return sock.sendMessage(from, { text: `Kamu masih capek dari petualangan sebelumnya 🥺\nTunggu *${remaining} detik* lagi ya!` }, { quoted: msg });
    }

    if (user.stamina < 1) {
        return sock.sendMessage(from, { text: 'Staminamu habis! 🥺\nKamu terlalu lelah untuk berpetualang. Tunggu regenerasi otomatis (1 per 10 menit) atau gunakan Potion.' }, { quoted: msg });
    }

    // Mengurangi stamina & update waktu
    user.stamina -= 1;
    user.inventory.stamina = user.stamina;
    user.inventory.lastAdventure = now;

    // Reward Dasar
    let goldFound = Math.floor(Math.random() * 50) + 10;
    let expGain = 20;

    // Cek Pet Aktif untuk Buff
    let petLuck = 0;
    let petExp = 0;
    let petGold = 0;
    if (user.inventory.activePet) {
        const petData = petList.find(p => p.id === user.inventory.activePet);
        if (petData) {
            petGold = petData.bonus.gold || 0;
            petExp = petData.bonus.exp || 0;
            petLuck = petData.bonus.adventureLuck || petData.bonus.luck || 0;
            goldFound = Math.floor(goldFound * (1 + petGold));
            expGain = Math.floor(expGain * (1 + petExp));
        }
    }

    user.money += goldFound;
    let levelUpMsg = addExp(sender, expGain); // Akan menggunakan data db setelah ini jadi kita return di variabel saja
    
    // Namun kita perlu sinkronisasi user lokal kita setelah addExp dipanggil dari luar
    // Tapi karena sqlite transaksi lebih kompleks kalau nested, kita manual tambah exp di instance user sementara saja untuk hitungannya
    user.exp += expGain;
    
    let replyText = `⚔️ *PETUALANGAN ${user.name.toUpperCase()}* ⚔️\n\n` +
                    `Kamu pergi berpetualang ke hutan dan kembali membawa:\n` +
                    `💰 *+${goldFound} Gold*\n` +
                    `✨ *+${expGain} EXP*\n`;

    // Drop Item (Gacha)
    if (Math.random() < (0.3 + petLuck)) {
        user.inventory["Potion"] = (user.inventory["Potion"] || 0) + 1;
        replyText += `\n🧪 *Kamu menemukan 1x Potion di semak-semak!*`;
    }
    if (Math.random() < (0.3 + petLuck)) {
        user.inventory["Buff Scroll"] = (user.inventory["Buff Scroll"] || 0) + 1;
        replyText += `\n📜 *Kamu menemukan 1x Buff Scroll dari monster mati!*`;
    }
    
    // Gacha Drop Bibit (Farming)
    if (Math.random() < (0.07 + petLuck)) {
        const seedList = require('../../data/seedData');
        // Bisa drop SEMUA bibit, termasuk Legendary
        const dropSeed = seedList[Math.floor(Math.random() * seedList.length)];
        user.inventory[dropSeed.name] = (user.inventory[dropSeed.name] || 0) + 1;
        replyText += `\n🌱 *Kamu menemukan 1x ${dropSeed.name}!* (Bisa ditanam pakai !tanam)`;
    }
    
    // Gacha Drop Petbox Super Langka (0.2% Dasar + Luck Pet)
    if (Math.random() < (0.002 + (petLuck * 0.05))) {
        user.inventory["Mystery Pet Box"] = (user.inventory["Mystery Pet Box"] || 0) + 1;
        replyText += `\n🎁 *JACKPOT!!! Kamu menemukan 1x Mystery Pet Box peninggalan orang zaman purba!*`;
    }
    if (Math.random() < 0.05) { // Disesuaikan dari 0.01 ke 0.05 agar sedikit lebih mudah
        user.inventory["Exp Book"] = (user.inventory["Exp Book"] || 0) + 1;
        replyText += `\n📘 *WAHH! Kamu menemukan 1x Exp Book yang sangat langka!*`;
    }

    // Drop Lure (Memangkas Waktu Mancing)
    const lureRand = Math.random();
    if (lureRand < 0.02) {
        user.inventory["Mythic Lure"] = (user.inventory["Mythic Lure"] || 0) + 1;
        replyText += `\n🌟 *DAPAT MYTHIC LURE! (-45 detik mancing)*`;
    } else if (lureRand < 0.08) {
        user.inventory["Epic Lure"] = (user.inventory["Epic Lure"] || 0) + 1;
        replyText += `\n🪀 *DAPAT EPIC LURE! (-30 detik mancing)*`;
    } else if (lureRand < 0.15) {
        user.inventory["Rare Lure"] = (user.inventory["Rare Lure"] || 0) + 1;
        replyText += `\n✨ *DAPAT RARE LURE! (-20 detik mancing)*`;
    } else if (lureRand < 0.3) {
        user.inventory["Common Lure"] = (user.inventory["Common Lure"] || 0) + 1;
        replyText += `\n🎣 *DAPAT COMMON LURE! (-10 detik mancing)*`;
    }

    // Drop Net (Menangkap Ikan Lebih Banyak)
    const netRand = Math.random();
    if (netRand < 0.02) {
        user.inventory["Mythic Net"] = (user.inventory["Mythic Net"] || 0) + 1;
        replyText += `\n🕸️🌟 *DAPAT MYTHIC NET! (Max 5 Ikan)*`;
    } else if (netRand < 0.08) {
        user.inventory["Epic Net"] = (user.inventory["Epic Net"] || 0) + 1;
        replyText += `\n🕸️ *DAPAT EPIC NET! (Max 4 Ikan)*`;
    } else if (netRand < 0.15) {
        user.inventory["Rare Net"] = (user.inventory["Rare Net"] || 0) + 1;
        replyText += `\n🕸️ *DAPAT RARE NET! (Max 3 Ikan)*`;
    } else if (netRand < 0.3) {
        user.inventory["Common Net"] = (user.inventory["Common Net"] || 0) + 1;
        replyText += `\n🕸️ *DAPAT COMMON NET! (Max 2 Ikan)*`;
    }

    if (levelUpMsg) replyText += `\n\n🎉 ${levelUpMsg}`;

    saveUsers(usersMap);

    return sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

module.exports = {
    handleAdventure
};
