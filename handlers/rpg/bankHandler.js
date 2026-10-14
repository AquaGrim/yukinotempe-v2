const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

async function handleBank(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    const user = getUser(sender);
    const usersMap = { [sender]: user };

    if (args.length === 0) {
        return sock.sendMessage(from, { 
            text: `🏦 *BANK YUKINOTEMPE* 🏦\n👤 Nasabah: *${user.name}*\n\n` +
                  `💼 Saldo Dompet: 💰 *${user.money.toLocaleString('id-ID')} Gold*\n` +
                  `🏧 Saldo Bank: 💰 *${(user.bank || 0).toLocaleString('id-ID')} Gold*\n\n` +
                  `_Bunga Bank: 1% / hari_\n\n` +
                  `*Cara Transaksi:*\n` +
                  `- *!nabung [jumlah]* (Simpan uang ke bank)\n` +
                  `- *!tarik [jumlah]* (Ambil uang dari bank)` 
        }, { quoted: msg });
    }

    const command = args[0].toLowerCase();
    
    // Command: Nabung
    if (command === 'nabung' || command === 'deposit') {
        if (args.length < 2) return sock.sendMessage(from, { text: 'Berapa gold yang mau ditabung?\nContoh: *!nabung 500* atau *!nabung all*' }, { quoted: msg });
        
        let amount = args[1].toLowerCase() === 'all' || args[1].toLowerCase() === 'semua' ? user.money : parseInt(args[1].replace(/[^0-9]/g, ''));
        
        if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: 'Jumlah nabung harus berupa angka yang valid yaa! 🥺' }, { quoted: msg });
        if (user.money < amount) return sock.sendMessage(from, { text: `Yahh uang di dompet kamu kurang! Uangmu sekarang cuma 💰 *${user.money.toLocaleString('id-ID')} Gold*.` }, { quoted: msg });

        user.money -= amount;
        user.bank = (user.bank || 0) + amount;

        saveUsers(usersMap);
        return sock.sendMessage(from, { text: `✅ Berhasil menabung!\n💰 *${amount.toLocaleString('id-ID')} Gold* telah dimasukkan ke Bank.\n\n💼 Sisa Dompet: *${user.money.toLocaleString('id-ID')} Gold*\n🏧 Total di Bank: *${user.bank.toLocaleString('id-ID')} Gold*` }, { quoted: msg });
    }

    // Command: Tarik
    if (command === 'tarik' || command === 'withdraw' || command === 'wd') {
        if (args.length < 2) return sock.sendMessage(from, { text: 'Berapa gold yang mau ditarik?\nContoh: *!tarik 500* atau *!tarik all*' }, { quoted: msg });
        
        let amount = args[1].toLowerCase() === 'all' || args[1].toLowerCase() === 'semua' ? (user.bank || 0) : parseInt(args[1].replace(/[^0-9]/g, ''));
        
        if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: 'Jumlah tarik harus berupa angka yang valid yaa! 🥺' }, { quoted: msg });
        if ((user.bank || 0) < amount) return sock.sendMessage(from, { text: `Yahh saldo di Bank kamu kurang! Saldo Bankmu sekarang cuma 💰 *${(user.bank || 0).toLocaleString('id-ID')} Gold*.` }, { quoted: msg });

        user.bank -= amount;
        user.money += amount;

        saveUsers(usersMap);
        return sock.sendMessage(from, { text: `🏧 Berhasil menarik saldo!\n💰 *${amount.toLocaleString('id-ID')} Gold* telah dipindahkan ke Dompet.\n\n💼 Total Dompet: *${user.money.toLocaleString('id-ID')} Gold*\n🏧 Sisa di Bank: *${user.bank.toLocaleString('id-ID')} Gold*` }, { quoted: msg });
    }
}

module.exports = { handleBank };