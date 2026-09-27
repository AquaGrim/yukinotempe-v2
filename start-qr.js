const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Yukinotempe V2', 'Chrome', '20.0.04']
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') {
            console.log('\n==================================');
            console.log('🎉 BERHASIL CONNECT! Bot sudah login!');
            console.log('==================================\n');
            process.exit(0); // Keluar otomatis setelah berhasil
        }
    });
    sock.ev.on('creds.update', saveCreds);
}
start();