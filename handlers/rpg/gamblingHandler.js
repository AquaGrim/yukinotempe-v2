const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

// Variabel memori untuk mencatat waktu (cooldown) terakhir kali setiap user bermain judi
const gamblingCooldowns = new Map();
const COOLDOWN_TIME = 10 * 1000; // 10 detik dalam satuan milidetik

function checkCooldown(sender) {
    const lastPlayed = gamblingCooldowns.get(sender);
    const now = Date.now();

    if (lastPlayed && (now - lastPlayed < COOLDOWN_TIME)) {
        const sisaWaktu = Math.ceil((COOLDOWN_TIME - (now - lastPlayed)) / 1000);
        return sisaWaktu;
    }
    return 0; // 0 berarti tidak kena cooldown
}

// 1. Coin Flip
async function handleCoinFlip(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const cooldownLeft = checkCooldown(sender);
    if (cooldownLeft > 0) {
        return sock.sendMessage(from, { text: `Sabar sayang! 🥺\nTunggu *${cooldownLeft} detik* lagi ya sebelum berjudi!` }, { quoted: msg });
    }

    if (args.length < 2) {
        return sock.sendMessage(from, { text: 'Format salah sayang! 🥺\nCara pakai: *!cf [head/tail] [jumlah taruhan]*\nContoh: *!cf head 100*' }, { quoted: msg });
    }

    const tebakan = args[0].toLowerCase();
    if (tebakan !== 'head' && tebakan !== 'tail') {
        return sock.sendMessage(from, { text: 'Pilihannya cuma *head* atau *tail* yaa sayang! 🪙' }, { quoted: msg });
    }

    let taruhan = parseInt(args[1]);
    if (isNaN(taruhan) || taruhan <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah taruhannya harus angka dan lebih dari 0 ya sayang! 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const usersMap = { [sender]: user };

    if (user.money < taruhan) {
        return sock.sendMessage(from, { text: `Yahh uang kamu nggak cukup! 🥺\nUangmu sekarang: 💰 ${user.money} Gold` }, { quoted: msg });
    }

    // Mengundi coin
    const hasilCoin = Math.random() < 0.5 ? 'head' : 'tail';
    
    let replyMsg = `🪙 *COIN FLIP* 🪙\n👤 Pemain: *${user.name}*\n\nKamu memilih: *${tebakan.toUpperCase()}*\nCoin menunjukkan: *${hasilCoin.toUpperCase()}*\n\n`;

    if (tebakan === hasilCoin) {
        user.money += taruhan; // Nett untung +1x lipat (karena uang awal tidak diambil). Secara total dompet jadi x2 taruhan.
        replyMsg += `🎉 *MENANG!* Kamu mendapatkan 💰 ${taruhan * 2} Gold (Nett: +${taruhan})!\nTotal uangmu: 💰 ${user.money} Gold`;
    } else {
        user.money -= taruhan;
        replyMsg += `💀 *KALAH!* Kamu kehilangan 💰 ${taruhan} Gold!\nTotal uangmu: 💰 ${user.money} Gold`;
    }

    // Set waktu terakhir bermain
    gamblingCooldowns.set(sender, Date.now());

    saveUsers(usersMap);
    return sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
}

// 2. Mesin Slot
async function handleSlot(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const cooldownLeft = checkCooldown(sender);
    if (cooldownLeft > 0) {
        return sock.sendMessage(from, { text: `Mesinnya masih panas sayang! 🥺\nTunggu *${cooldownLeft} detik* lagi ya sebelum putar slot lagi!` }, { quoted: msg });
    }

    if (args.length < 1) {
        return sock.sendMessage(from, { text: 'Format salah sayang! 🥺\nCara pakai: *!slot [jumlah taruhan]*\nContoh: *!slot 500*' }, { quoted: msg });
    }

    let taruhan = parseInt(args[0]);
    if (isNaN(taruhan) || taruhan <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah taruhannya harus angka dan lebih dari 0 ya sayang! 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const usersMap = { [sender]: user };

    if (user.money < taruhan) {
        return sock.sendMessage(from, { text: `Yahh uang kamu nggak cukup! 🥺\nUangmu sekarang: 💰 ${user.money} Gold` }, { quoted: msg });
    }

    const emojis = ['🍒', '🍎', '🍇', '💎', '7️⃣'];
    
    // Sistem Rigging (Penyesuaian Win Rate)
    // 0 = Kalah total (Ketiga buah beda)
    // 1 = Menang kecil (Dua buah sama)
    // 2 = JACKPOT (Tiga buah sama)
    
    const rng = Math.random();
    let resultType = 0;
    
    // Chance baru: Jackpot = 5%, Menang Kecil = 20%, Kalah = 75%
    if (rng < 0.05) {
        resultType = 2; // Jackpot
    } else if (rng < 0.25) {
        resultType = 1; // Menang kecil
    } else {
        resultType = 0; // Kalah
    }

    let s1, s2, s3;

    if (resultType === 2) {
        s1 = emojis[Math.floor(Math.random() * emojis.length)];
        s2 = s1;
        s3 = s1;
    } else if (resultType === 1) {
        s1 = emojis[Math.floor(Math.random() * emojis.length)];
        s2 = s1;
        
        do {
            s3 = emojis[Math.floor(Math.random() * emojis.length)];
        } while (s3 === s1); // Pastikan buah ketiga beda supaya tidak jadi jackpot
        
        // Acak posisinya (Bisa buah pertama yang beda, atau di tengah)
        const shufflePos = Math.floor(Math.random() * 3);
        if (shufflePos === 1) { [s1, s3] = [s3, s1]; }
        else if (shufflePos === 2) { [s2, s3] = [s3, s2]; }
    } else {
        s1 = emojis[Math.floor(Math.random() * emojis.length)];
        
        do {
            s2 = emojis[Math.floor(Math.random() * emojis.length)];
        } while (s2 === s1);
        
        do {
            s3 = emojis[Math.floor(Math.random() * emojis.length)];
        } while (s3 === s1 || s3 === s2);
    }

    let replyMsg = `🎰 *MESIN SLOT* 🎰\n👤 Pemain: *${user.name}*\n\n[ ${s1} | ${s2} | ${s3} ]\n\n`;

    if (s1 === s2 && s2 === s3) {
        const hadiah = taruhan * 9; // nett untung x9 (karena ditambah sama uang taruhan di awal yang tidak ditarik dari dompet) sehingga x10 secara hitungan murni.
        user.money += hadiah;
        replyMsg += `JACKPOT!!! 🎉🎉🎉\nKamu menang 💰 ${taruhan * 10} Gold (Nett: +${hadiah})!\nTotal uangmu: 💰 ${user.money} Gold`;
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        const hadiah = taruhan; // x2 secara total (kembali modal + untung 1x lipat) karena kalau ditambah ke user.money yang lama, jadinya x2. Kalau * 2 jadinya x3.
        user.money += hadiah;
        replyMsg += `Selamat! 🎉\nKamu menang 💰 ${taruhan * 2} Gold (Nett: +${hadiah})!\nTotal uangmu: 💰 ${user.money} Gold`;
    } else {
        user.money -= taruhan;
        replyMsg += `Yahh amsyong... 💀\nKamu kehilangan 💰 ${taruhan} Gold!\nTotal uangmu: 💰 ${user.money} Gold`;
    }

    // Set waktu terakhir bermain
    gamblingCooldowns.set(sender, Date.now());

    saveUsers(usersMap);
    return sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
}

module.exports = {
    handleCoinFlip,
    handleSlot
};
