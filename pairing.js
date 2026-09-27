const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const logger = pino({ level: 'silent' });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    setTimeout(async () => {
        if (!sock.authState.creds.registered) {
            const phoneNumber = await question('Masukkan nomor bot (format: 628xxx): ');
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log('\n================================');
                console.log(`KODE PAIRING KAMU: ${code}`);
                console.log('================================\n');
            } catch (err) {
                console.error('Gagal generate kode:', err);
            }
        }
    }, 2000);

    sock.ev.on('creds.update', saveCreds);
}
start();
