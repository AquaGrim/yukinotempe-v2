const { getUsers, saveUsers } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 jam

async function handleDaily(sock, msg, from, sender) {
    const users = getUsers();
    const user = users[sender];

    if (!user) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar di Yukinotempe! 🥺\nKetik *!regist Nama | Umur* untuk mendaftar.' }, { quoted: msg });
    }

    const now = Date.now();
    if (user.lastDaily && now - user.lastDaily < DAILY_COOLDOWN) {
        const remaining = DAILY_COOLDOWN - (now - user.lastDaily);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return sock.sendMessage(from, { text: `Tunggu dulu sayang! 🥺\nKamu baru bisa klaim harian lagi dalam *${hours} jam ${minutes} menit*.` }, { quoted: msg });
    }

    // Hadiah harian dasar
    const goldReward = 200;
    const expReward = 50;

    user.money = (user.money || 0) + goldReward;
    
    // Pastikan inventory ada
    if (!user.inventory) user.inventory = {};
    user.inventory["Potion"] = (user.inventory["Potion"] || 0) + 1;

    user.lastDaily = now;
    
    // Harus mempassing object map karena format saveUsers membutuhkan format { [sender]: user }
    const usersMap = { [sender]: user };
    saveUsers(usersMap);

    // Tambah EXP
    const levelUpMsg = addExp(sender, expReward);

    let replyText = `🎁 *Klaim Harian Berhasil!* 🎁\n\n` +
                    `Kamu mendapatkan:\n` +
                    `💰 *+${goldReward} Gold*\n` +
                    `✨ *+${expReward} EXP*\n` +
                    `🧪 *+1 Potion*\n\n` +
                    `Uangmu sekarang: ${user.money} Gold. 💜`;

    if (levelUpMsg) {
        replyText += `\n\n🎉 ${levelUpMsg}`;
    }

    return sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

module.exports = {
    handleDaily
};
