const fs = require("fs");
const path = require("path");
const soalPath = path.join(__dirname, "../../data/tebakKata.json");
let soalList = [];

try {
    soalList = JSON.parse(fs.readFileSync(soalPath, "utf8"));
} catch (e) {
    console.error("Gagal membaca database soal tebak kata:", e);
}

const activeGames = new Map(); // key: chatId, value: { question, answer, timeout }

function getRandomSoal() {
    if (soalList.length === 0) return { question: "Bot belum punya soal", answer: "error" };
    return soalList[Math.floor(Math.random() * soalList.length)];
}

async function handleTebakKata(sock, msg, from, sender) {
    if (activeGames.has(from)) {
        return sock.sendMessage(from, { text: "❗ Masih ada soal yang belum dijawab di obrolan ini!" }, { quoted: msg });
    }

    const soal = getRandomSoal();

    const sentMsg = await sock.sendMessage(from, { text: `🧠 *Tebak Kata!*\n\n${soal.question}\n\n💬 *Balas pesan ini* dengan jawabanmu.\n⏱️ Waktu: 30 detik.` }, { quoted: msg });

    const timeout = setTimeout(() => {
        if (activeGames.has(from)) {
            sock.sendMessage(from, { text: `⏰ Waktu habis!\nJawabannya adalah: *${soal.answer.toUpperCase()}*` });
            activeGames.delete(from);
        }
    }, 30000);

    activeGames.set(from, {
        answer: soal.answer.toLowerCase(),
        messageId: sentMsg.key.id,
        timeout
    });
}

async function checkTebakKata(sock, msg, from, text) {
    if (!activeGames.has(from)) return false;

    // Cek apakah user sedang reply pesan soal
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const game = activeGames.get(from);

    // Cek apakah pesan yg di-reply ID-nya sama dengan ID pesan soal
    if (contextInfo && contextInfo.stanzaId === game.messageId) {
        if (text === game.answer) {
            clearTimeout(game.timeout);
            activeGames.delete(from);
            await sock.sendMessage(from, { text: `🎉 *BENAR!* Jawabannya adalah *${game.answer.toUpperCase()}*` }, { quoted: msg });
            return true;
        } else {
            await sock.sendMessage(from, { text: "❌ Salah! Coba lagi." }, { quoted: msg });
            return true;
        }
    }
    return false;
}

module.exports = {
    handleTebakKata,
    checkTebakKata
};
