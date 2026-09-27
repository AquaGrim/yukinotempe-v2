const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Yukinotempe V2', 'Chrome', '20.0.04']
    });

    sock.ev.on('connection.update', (update) => {
        const { qr, connection } = update;
        if (qr) {
            console.clear();
            qrcode.generate(qr, { small: true });
            console.log('\n☝️ SILAKAN SCAN QR CODE DI ATAS ☝️\n(Akan refresh otomatis jika expired)\n');
        }
        if (connection === 'open') {
            console.clear();
            console.log('🎉 BERHASIL CONNECT! Bot sudah login! 🎉\nSilakan tekan Ctrl+C untuk keluar dan run bot utama.');
        }
    });
    sock.ev.on('creds.update', saveCreds);
}
start();
