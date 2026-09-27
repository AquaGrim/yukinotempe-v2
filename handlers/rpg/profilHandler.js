const { getUsers, isUserRegistered } = require('../../utils/databaseHelper');

async function handleProfile(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const users = getUsers();
    const user = users[sender];
    
    // Perhitungan EXP yang dibutuhkan untuk next level
    const nextLevelExp = user.level * 100;
    
    const staminaDisplay = user.stamina !== undefined ? user.stamina : (user.maxStamina || 10);
    const maxStaminaDisplay = user.maxStamina || 10;

    const profileText = `📊 *PROFIL YUKINOTEMPE* 📊\n\n` +
                        `👤 *Nama:* ${user.name}\n` +
                        `🎂 *Umur:* ${user.age}\n` +
                        `🌟 *Level:* ${user.level}\n` +
                        `✨ *EXP:* ${user.exp} / ${nextLevelExp}\n` +
                        `💰 *Gold:* ${user.money || 0}\n` +
                        `⚡ *Stamina:* ${staminaDisplay} / ${maxStaminaDisplay}\n\n` +
                        `_Ketik *!inv* atau *!inventory* untuk melihat isi tasmu._\n\n` +
                        `_Terdaftar pada: ${new Date(user.registeredAt).toLocaleDateString('id-ID')}_`;

    return sock.sendMessage(from, { text: profileText }, { quoted: msg });
}

async function handleLeaderboard(sock, msg, from, sender) {
    const users = getUsers();
    
    // Konversi object users ke array dan saring user yang banned
    let playerList = Object.keys(users)
        .map(id => ({
            id,
            name: users[id].name,
            level: users[id].level,
            money: users[id].money || 0,
            isBanned: users[id].isBanned || 0
        }))
        .filter(player => player.isBanned === 0);

    if (playerList.length === 0) {
        return sock.sendMessage(from, { text: 'Belum ada player yang terdaftar 🥺' }, { quoted: msg });
    }

    // Urutkan berdasarkan Level tertinggi, kalau level sama urutkan berdasarkan Gold terbanyak
    playerList.sort((a, b) => {
        if (b.level !== a.level) {
            return b.level - a.level;
        }
        return b.money - a.money;
    });

    // Ambil 10 teratas
    const top10 = playerList.slice(0, 10);

    let text = "🏆 *LEADERBOARD YUKINOTEMPE* 🏆\n_Top 10 Player Terbaik (Berdasarkan Level)_\n\n";

    top10.forEach((p, index) => {
        let medal = "";
        if (index === 0) medal = "🥇";
        else if (index === 1) medal = "🥈";
        else if (index === 2) medal = "🥉";
        else medal = `[${index + 1}]`;

        text += `${medal} *${p.name}* (Lvl ${p.level}) - 💰 ${p.money.toLocaleString('id-ID')} G\n`;
    });

    return sock.sendMessage(from, { text: text.trim() }, { quoted: msg });
}

module.exports = { handleProfile, handleLeaderboard };