const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const TEMP_DIR = path.join(__dirname, "../../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

function generateTempFilename(ext = "") {
    const hash = crypto.randomBytes(8).toString("hex");
    return path.join(TEMP_DIR, `${Date.now()}_${hash}${ext}`);
}

async function downloadMedia(message, type) {
    let media;
    if (type === 'image') media = message.imageMessage;
    else if (type === 'sticker') media = message.stickerMessage;
    if (!media) return null;
    const stream = await downloadContentFromMessage(media, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function handleSticker(sock, msg, from) {
    const messageType = Object.keys(msg.message || {})[0];
    const isImage = messageType === 'imageMessage';
    const isQuotedImage = messageType === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage;

    if (!isImage && !isQuotedImage) {
        return sock.sendMessage(from, { text: '❌ Harap kirim gambar atau reply gambar dengan caption *!sticker*' }, { quoted: msg });
    }

    const targetMessage = isImage ? msg.message : msg.message.extendedTextMessage.contextInfo.quotedMessage;

    try {
        const mediaBuffer = await downloadMedia(targetMessage, 'image');
        if (!mediaBuffer) return sock.sendMessage(from, { text: '⚠️ Gagal mengambil media.' }, { quoted: msg });
        return sock.sendMessage(from, { sticker: mediaBuffer }, { quoted: msg });
    } catch (e) {
        console.error('[STICKER] Error making sticker:', e);
        return sock.sendMessage(from, { text: '⚠️ Gagal membuat stiker.' }, { quoted: msg });
    }
}

async function handleBratSticker(sock, msg, from, textInput) {
    const overlayText = textInput || "BRAT";
    const Jimp = require("jimp");

    try {
        const font = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK);
        
        let maxChars = 15;
        if (overlayText.length < 20) maxChars = 10;
        if (overlayText.length < 10) maxChars = 6;
        
        const lines = [];
        let currentLine = "";
        for (const word of overlayText.split(" ")) {
            if ((currentLine + " " + word).length > maxChars) {
                if (currentLine) lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine = currentLine ? currentLine + " " + word : word;
            }
        }
        if (currentLine) lines.push(currentLine.trim());

        let maxWidth = 0;
        const lineSpacing = 130; 
        for (const text of lines) {
            const width = Jimp.measureText(font, text);
            if (width > maxWidth) maxWidth = width;
        }
        
        const totalHeight = lines.length * lineSpacing;
        const textCanvas = await new Jimp(maxWidth + 20, totalHeight + 40, 0x00000000);
        
        // Aturan perataan teks (Alignment)
        for (let i = 0; i < lines.length; i++) {
            const textWidth = Jimp.measureText(font, lines[i]);
            let xPos = 0;
            
            // Jika lebih dari 1 baris -> Rata Tengah (Center)
            // Jika hanya 1 baris -> Tetap Rata Kiri
            if (lines.length > 1) {
                xPos = (maxWidth - textWidth) / 2;
            }
            
            textCanvas.print(font, xPos + 10, i * lineSpacing, lines[i]);
        }
        
        textCanvas.autocrop(false);
        
        // Di-scaleToFit ke 480 agar menyisakan sedikit border rapi (tidak terpotong pinggiran mentok 100%)
        textCanvas.scaleToFit(480, 480);

        const finalImage = await new Jimp(512, 512, 0xffffffff);
        
        // Posisikan kanvas teks persis di tengah-tengah stiker utama
        const centerX = (512 - textCanvas.bitmap.width) / 2;
        const centerY = (512 - textCanvas.bitmap.height) / 2;
        
        finalImage.composite(textCanvas, centerX, centerY);
        
        // Blur dikurangi dari 2 menjadi 1.5 agar buramnya lebih 'pas' seperti gambar yang kamu kirim
        finalImage.blur(1.5); 
        
        const pngBuffer = await finalImage.getBufferAsync(Jimp.MIME_PNG);
        const sharp = require('sharp');
        const webpBuffer = await sharp(pngBuffer).webp().toBuffer();

        return sock.sendMessage(from, { sticker: webpBuffer }, { quoted: msg });
    } catch (error) {
        console.error("[BRAT] Error:", error);
        return sock.sendMessage(from, { text: "❌ Gagal membuat brat stiker." }, { quoted: msg });
    }
}

module.exports = {
    handleSticker,
    handleBratSticker
};
