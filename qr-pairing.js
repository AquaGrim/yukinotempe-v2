const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Yukinotempe V2', 'Chrome', '20.0.04']
    });

    sock.ev.on('connection.update', async (update) => {
        const { qr, connection } = update;
        if (qr) {
            await QRCode.toFile('./qr.png', qr);
            console.log('QR_READY');
        }
        if (connection === 'open') {
            console.log('CONNECTED');
        }
    });
    sock.ev.on('creds.update', saveCreds);
}
start();
