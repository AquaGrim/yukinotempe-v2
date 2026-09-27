const { isUserRegistered, registerUser, getUsers } = require('../../utils/databaseHelper');

async function handleRegister(sock, msg, from, sender, args) {
    if (isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu sudah terdaftar di database Yukinotempe! 💜' }, { quoted: msg });
    }

    const input = args.join(' ');
    // Format yang diharapkan: !regist Nama | Umur
    if (!input.includes('|')) {
        return sock.sendMessage(from, { text: 'Format registrasi salah 🥺\nCara pakai: *!regist Nama | Umur*\nContoh: *!regist Zeta | 18*' }, { quoted: msg });
    }

    const [nameRaw, ageRaw] = input.split('|');
    const name = nameRaw.trim();
    const age = parseInt(ageRaw.trim());

    if (!name || isNaN(age)) {
        return sock.sendMessage(from, { text: 'Pastikan nama dan umur diisi dengan benar yaa! Umur harus berupa angka. 🥺' }, { quoted: msg });
    }

    const success = registerUser(sender, name, age);
    
    if (success) {
        const users = getUsers();
        const totalUsers = Object.keys(users).length;
        
        // Menghapus domain @s.whatsapp.net, @lid, dan menghilangkan tanda titik dua dari pairing JID
        let displayNomor = sender.split('@')[0];
        if (displayNomor.includes(':')) {
            displayNomor = displayNomor.split(':')[0];
        }

        // Handle khusus jika yang tersimpan masih berformat LID
        if (displayNomor.startsWith('1400')) {
            displayNomor = "Disembunyikan (Private LID)";
        }

        const replyText = `🎉 *Registrasi Berhasil!* 🎉\n\n` +
                          `👤 *Nama:* ${name}\n` +
                          `🎂 *Umur:* ${age}\n` +
                          `📱 *Nomor:* ${displayNomor}\n\n` +
                          `Selamat datang di Yukinotempe! Kamu adalah user ke-${totalUsers}. 💜\n` +
                          `Ketik *!menu* untuk melihat daftar perintah.`;
                          
        return sock.sendMessage(from, { text: replyText }, { quoted: msg });
    } else {
        return sock.sendMessage(from, { text: 'Sepertinya terjadi kesalahan saat mendaftar 🥺' }, { quoted: msg });
    }
}

module.exports = {
    handleRegister
};