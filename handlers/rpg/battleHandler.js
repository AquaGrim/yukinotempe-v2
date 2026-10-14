const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');

const BATTLE_COOLDOWN = 1 * 60 * 1000; // 1 Menit (Disesuaikan jadi 1 menit biar seru)

async function handleBattle(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    const usersMap = { [sender]: user };

    if (user.stamina === undefined) user.stamina = user.maxStamina || 10;

    const now = Date.now();
    const lastBattle = user.inventory.lastBattle || 0;

    if (now - lastBattle < BATTLE_COOLDOWN) {
        const remaining = Math.ceil((BATTLE_COOLDOWN - (now - lastBattle)) / 1000);
        return sock.sendMessage(from, { text: `Kamu masih kelelahan habis berantem 🥺\nTunggu *${remaining} detik* lagi ya!` }, { quoted: msg });
    }

    if (user.stamina < 1) {
        return sock.sendMessage(from, { text: 'Staminamu habis! (Butuh 1 Stamina) 🥺\nTunggu regenerasi otomatis (1 per 10 menit) atau gunakan Potion.' }, { quoted: msg });
    }

    // Mengurangi stamina & update waktu
    user.stamina -= 1;
    user.inventory.stamina = user.stamina;
    user.inventory.lastBattle = now;

    // Kalkulasi Win Rate
    let winChance = 0.5; // Base 50%
    let bonusExpRate = 1;

    // Buff Profesi Ksatria
    if (user.inventory.job === 'ksatria') {
        const jobLv = user.inventory.jobLevel || 1;
        winChance += (jobLv / 100); // Nambah 1% peluang menang per level job
        bonusExpRate += (jobLv * 2 / 100); // Nambah 2% EXP per level job
    }

    // Handle Buff Scroll
    let buffInfo = "";
    if (user.inventory.buffActive && user.inventory.buffCharges > 0) {
        winChance += 0.25; // Tetap 25% fix per pertarungan
        user.inventory.buffCharges -= 1; // Kurangi 1 charge
        
        buffInfo = `\n_(📜 Efek Buff +25% Aktif! Sisa ${user.inventory.buffCharges}x)_`;
        
        // Kalau jatah habis, matikan buff-nya
        if (user.inventory.buffCharges <= 0) {
            user.inventory.buffActive = false;
        }
    } else if (user.inventory.buffActive) {
        // Fallback kalau data lama belum pake system charges
        winChance += 0.25;
        user.inventory.buffActive = false;
        buffInfo = `\n_(📜 Efek Buff +25% Aktif! Buff habis)_`;
    }

    if (Math.random() > winChance) {
        saveUsers(usersMap);
        return sock.sendMessage(from, { text: `⚔️ *PERTARUNGAN* ⚔️\n\nAduh! Kamu kalah melawan monster hutan 🥺\nCoba lagi nanti.${buffInfo}` }, { quoted: msg });
    }

    // Kalau Menang
    const goldFound = Math.floor(Math.random() * 40) + 20; // 20 - 59 Gold
    const expGain = Math.floor((Math.floor(Math.random() * 15) + 10) * bonusExpRate); // 10 - 24 EXP

    user.money += goldFound;
    user.exp += expGain;
    
    // === JOB SYSTEM EXP ===
    const { addJobExp } = require('../../utils/jobHelper');
    let jobExpText = "";
    const jobResult = addJobExp(sender, "ksatria", 40); // Bertarung dapet +40 Job EXP
    if (jobResult.leveledUp) {
        jobExpText = `\n🎓 *PROFESI NAIK LEVEL!* Kemampuan Ksatria-mu kini Lv.${jobResult.newLevel}!`;
    }

    let replyText = `⚔️ *PERTARUNGAN* ⚔️\n\n` +
                    `Kamu berhasil mengalahkan monster hutan dengan telak! 🎉\n` +
                    `💰 *+${goldFound} Gold*\n` +
                    `✨ *+${expGain} EXP*\n` + buffInfo + `\n` + jobExpText;

    // Drop Spesial: Gold Coin
    user.inventory["Gold Coin"] = (user.inventory["Gold Coin"] || 0) + 1;
    replyText += `🪙 *Monster itu juga menjatuhkan 1x Gold Coin!* (Gunakan !pakai "gold coin")`;

    let levelUpMsg = addExp(sender, expGain); 
    if (levelUpMsg) replyText += `\n\n🎉 ${levelUpMsg}`;

    saveUsers(usersMap);

    return sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

module.exports = {
    handleBattle
};
