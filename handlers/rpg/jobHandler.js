const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { jobConfig, getJobExpRequired } = require('../../utils/jobHelper');

async function handleJob(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    const command = args[0] ? args[0].toLowerCase() : 'info';

    if (command === 'info') {
        if (!user.inventory.job) {
            let text = "🏢 *KANTOR PEKERJAAN (JOB SYSTEM)* 🏢\n\nKamu belum memiliki profesi. Pilih salah satu profesi untuk mendapatkan skill pasif dan Job EXP.\n\n*Pilihan Profesi:*\n";
            for (const [key, val] of Object.entries(jobConfig)) {
                text += `👨‍🔧 *${val.name}*\n📝 ${val.desc}\n\n`;
            }
            text += `_Ketik *!job pilih [nama_job]* untuk memilih. (Contoh: !job pilih petani)_`;
            return sock.sendMessage(from, { text: text }, { quoted: msg });
        }

        const activeJob = jobConfig[user.inventory.job];
        const jobLv = user.inventory.jobLevel || 1;
        const currentExp = user.inventory.jobExp || 0;
        const requiredExp = getJobExpRequired(jobLv);
        
        let statBonusText = "";
        if (user.inventory.job === 'petani') statBonusText = `+${Math.floor(jobLv * 1.5)}% Ekstra Hasil Panen 🌾`;
        else if (user.inventory.job === 'nelayan') statBonusText = `+${Math.floor(jobLv * 2)}% Bonus Harga Jual Ikan 💰`;
        else if (user.inventory.job === 'ksatria') statBonusText = `+${jobLv}% Win Rate & +${jobLv * 2}% EXP Lawan ⚔️`;

        const infoText = `🏢 *PROFIL PROFESI KAMU* 🏢\n\n` +
                         `🛡️ Profesi Aktif: *${activeJob.name}*\n` +
                         `📈 Level Profesi: *Lv.${jobLv}*\n` +
                         `🔥 Job EXP: *${currentExp} / ${requiredExp}*\n\n` +
                         `✨ *Statistik Pasif Saat Ini:*\n${statBonusText}\n\n` +
                         `_(Jika ingin berganti profesi ketik *!job resign [nama_job]*. Peringatan: Pindah kerja membuat Level Job mu mengulang dari 1)_`;
        
        return sock.sendMessage(from, { text: infoText }, { quoted: msg });
    }

    if (command === 'pilih' || command === 'resign') {
        const choice = args[1] ? args[1].toLowerCase() : null;
        if (!choice || !jobConfig[choice]) {
            return sock.sendMessage(from, { text: `Profesi itu tidak ada! Pilih: *petani*, *nelayan*, atau *ksatria*.` }, { quoted: msg });
        }

        if (user.inventory.job === choice) {
            return sock.sendMessage(from, { text: `Kamu saat ini sudah bekerja sebagai ${jobConfig[choice].name}! 😂` }, { quoted: msg });
        }

        const isResign = command === 'resign';
        
        // Tetapkan pekerjaan baru
        user.inventory.job = choice;
        user.inventory.jobLevel = 1;
        user.inventory.jobExp = 0;
        
        saveUsers({ [sender]: user });
        
        let replyText = `🎉 *SELAMAT!* 🎉\nKamu sekarang resmi bekerja sebagai *${jobConfig[choice].name}*!\n\n_Level Job kamu dimulai dari Lv.1, rajin-rajin bekerja untuk menaikkannya!_`;
        
        if (isResign) {
            replyText = `⚠️ *RESIGNATION BERHASIL* ⚠️\nKamu telah membuang pekerjaan lamamu dan berpindah haluan.\nKamu kini bekerja sebagai *${jobConfig[choice].name}*.\n\n_Seluruh progress job lamamu telah hangus dan level diulang ke Lv.1._`;
        }

        return sock.sendMessage(from, { text: replyText }, { quoted: msg });
    }
}

module.exports = { handleJob };
