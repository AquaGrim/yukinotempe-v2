const translate = require("@vitalets/google-translate-api");
const axios = require("axios");
const quotes = require('../../data/quotes.json'); // Nanti kita buat filenya
const importantDays = require('../../data/importantDays.json');

async function handleEdukasi(sock, msg, from, sender, command, args) {
    if (command === 'katabijak') {
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        return sock.sendMessage(from, { text: `💬 *Kata Bijak Hari Ini:*\n"${quote}"` }, { quoted: msg });
    }
    
    if (command === 'hinarisky') {
        const hinaanRisky = [
            "Risky bau.", "Risky loading terus, sinyal aja udah nyerah.",
            "Risky kalau mikir suka buffering.", "Risky main petak umpet sendiri aja bisa kalah.",
            "Risky jago sih… jago bikin kesel.", "Risky itu misterius, bahkan otaknya nggak tahu dia mikir apa.",
            "Risky itu kayak WiFi publik, banyak janji tapi lelet.", "Risky kalau ngasih solusi bikin masalah baru.",
            "Risky masuk ruangan, IQ langsung turun 10 poin.", "Risky ngomong dikit, dunia langsung butuh penjelasan.",
            "Risky itu unik… uniknya bikin bingung.", "Risky itu kaya update Windows, munculnya dadakan dan bikin kacau.",
            "Risky nyari logika, tapi logikanya malah kabur duluan.", "Risky cocoknya jadi misteri nasional.",
            "Risky punya dua mode: diam atau salah ngomong.", "Risky kalau ujian, soal malah nanya balik.",
            "Risky kalau mikir, Google bingung jawabnya.", "Risky ikut lomba lari, start aja udah capek.",
            "Risky kalau jadi sinetron, episodenya penuh plot hole.", "Risky itu paket lengkap: lemot, nyebelin, tapi tetap dicari temannya."
        ];
        const quote = hinaanRisky[Math.floor(Math.random() * hinaanRisky.length)];
        return sock.sendMessage(from, { text: `🤡 *Hinaan untuk Risky hari Ini:*\n"${quote}"` }, { quoted: msg });
    }

    if (command === 'kamus') {
        const word = args.join(" ");
        if (!word) {
            return sock.sendMessage(from, { text: "❗ Contoh penggunaan: *!kamus beautiful*" }, { quoted: msg });
        }
        try {
            const res = await translate(word, { to: "id" });
            return sock.sendMessage(from, { text: `📖 *Terjemahan:*\n${word} = ${res.text}` }, { quoted: msg });
        } catch {
            return sock.sendMessage(from, { text: "⚠️ Gagal menerjemahkan kata tersebut." }, { quoted: msg });
        }
    }

    if (command === 'haribesar') {
        const today = new Date();
        const key = `${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
        const event = importantDays[key];
        
        return sock.sendMessage(from, { text: event ? `🎉 *Hari Ini:* ${event}` : "📅 Tidak ada perayaan hari besar nasional/internasional hari ini." }, { quoted: msg });
    }

    if (command === 'ayat') {
        try {
            const res = await axios.get("https://api.alquran.cloud/v1/ayah/random/id.indonesian");
            const ayat = res.data.data;
            const text = `📖 *${ayat.surah.englishName} ${ayat.surah.number}:${ayat.numberInSurah}*\n\n${ayat.text}\n\n*Terjemahan:*\n_${ayat.translation}_`;
            return sock.sendMessage(from, { text: text }, { quoted: msg });
        } catch (e) {
            console.error('[ERROR] Gagal Fetch Ayat API:', e);
            return sock.sendMessage(from, { text: "⚠️ Gagal mengambil ayat dari server. Coba lagi nanti." }, { quoted: msg });
        }
    }
}

module.exports = {
    handleEdukasi
};
