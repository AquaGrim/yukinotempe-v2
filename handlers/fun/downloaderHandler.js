const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const TEMP_DIR = path.join(__dirname, "../../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

async function handleDownloader(sock, msg, from, command, args) {
    if (command === 'tt' || command === 'tiktok') {
        const url = args[0];
        if (!url || !url.includes("tiktok.com")) {
            return sock.sendMessage(from, { text: "❌ URL TikTok tidak valid atau tidak dimasukkan.\nContoh: *!tiktok https://vt.tiktok.com/...*" }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: "⏳ Mengunduh video TikTok..." }, { quoted: msg });

        try {
            const res = await axios.get(`https://api.tiklydown.me/api/download?url=${encodeURIComponent(url)}`);
            const videoUrl = res.data?.data?.nowm || res.data?.data?.play;

            if (!videoUrl) {
                return sock.sendMessage(from, { text: "❌ Gagal mendapatkan link video dari API." }, { quoted: msg });
            }

            // Langsung kirim lewat link video untuk menghemat resource lokal (Baileys support ini)
            return sock.sendMessage(from, { video: { url: videoUrl }, caption: "🎵 Video TikTok berhasil diunduh!" }, { quoted: msg });
        } catch (error) {
            console.error("TikTok Error:", error.message);
            return sock.sendMessage(from, { text: "❌ Terjadi kesalahan saat mengunduh video TikTok." }, { quoted: msg });
        }
    }

    if (command === 'yt' || command === 'youtube') {
        // [FITUR INI DIMATIKAN SEMENTARA - KARENA BERAT UNTUK DITANGANI BERSAMA SERVER NODE KECIL + RAWAN TERKENA BAN DARI YT]
        return sock.sendMessage(from, { text: "⚠️ Fitur download YouTube sedang dinonaktifkan sementara oleh developer untuk pemeliharaan." }, { quoted: msg });
    }
}

module.exports = {
    handleDownloader
};
