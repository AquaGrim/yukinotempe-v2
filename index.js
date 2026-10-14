const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { startDashboard } = require('./dashboard/server');
const { checkEmails } = require('./utils/emailChecker');

// Konfigurasi Logger
const logger = pino({ level: 'silent' });

// Mulai Website Admin Dashboard di port 3000
startDashboard();

const { handleRegister } = require('./handlers/core/registerHandler');
const { handleMenu } = require('./handlers/core/menuHandler');
const { handleProfile, handleLeaderboard, handleSetBackground } = require('./handlers/rpg/profilHandler');
const { handleInventory } = require('./handlers/rpg/inventoryHandler');
const { handleDaily } = require('./handlers/rpg/dailyHandler');
const { addGroupContext } = require('./utils/yukiMemory');
const { handleFishing } = require('./handlers/rpg/fishingHandler');
const { handleShop, handleBuy, handleSell } = require('./handlers/rpg/shopHandler');
const { handleUseItem } = require('./handlers/rpg/itemHandler');
const { handleAdventure } = require('./handlers/rpg/adventureHandler');
const { handleBattle } = require('./handlers/rpg/battleHandler');
const { handleGacha } = require('./handlers/rpg/gachaHandler');
const { handleGift } = require('./handlers/rpg/giftHandler');
const { handleTransfer } = require('./handlers/rpg/transferHandler');
const { handleBank } = require('./handlers/rpg/bankHandler');
const { handleCoinFlip, handleSlot } = require('./handlers/rpg/gamblingHandler');
const { handleTicTacToe } = require('./handlers/rpg/tictactoeHandler');
const { handleAddGold, handleTakeGold, handleBanUser, handleListUsers, handleAddGoldAll, handleEventAdmin, handleTerminalExec } = require('./handlers/core/adminHandler');
const { handleFishList } = require('./handlers/rpg/fishListHandler');
const { handleFishIndex } = require('./handlers/rpg/fishIndexHandler');
const { handlePetIndex } = require('./handlers/rpg/petIndexHandler');
const { handlePet } = require('./handlers/rpg/petHandler');
const { handleFarm } = require('./handlers/rpg/farmHandler');
const { handleDuel } = require('./handlers/rpg/duelHandler');
const { handleJob } = require('./handlers/rpg/jobHandler');
const { setAfk, removeAfk, checkAfk, getAfkData } = require('./utils/afkHelper');
const { handleEdukasi } = require('./handlers/fun/edukasiHandler');
const { handleTebakKata, checkTebakKata } = require('./handlers/fun/tebakKataHandler');
const { handleSticker, handleBratSticker } = require('./handlers/fun/stickerHandler');
const { sendGiphy } = require('./utils/giphyHelper');
const { handleDownloader } = require('./handlers/fun/downloaderHandler');
const { handleTanyaAI } = require('./handlers/fun/aiHandler');
const { addExp } = require('./utils/levelingHelper');
const { isUserRegistered, getUser } = require('./utils/databaseHelper');
const usePairingCode = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[SYSTEM] Menggunakan WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    if (usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = await question('[SYSTEM] Masukkan nomor WhatsApp bot (misal: 628123456789): ');
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n[SYSTEM] KODE PAIRING KAMU: ${code}\nSilakan masukkan kode ini di aplikasi WhatsApp kamu (Perangkat Tautkan -> Tautkan dengan nomor telepon)\n`);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[SYSTEM] Koneksi terputus, alasan:', lastDisconnect.error?.message, 'Mencoba terhubung kembali:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('[SYSTEM] Sesi habis/dikeluarkan. Silakan hapus folder "session" dan scan/pairing ulang.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('[SYSTEM] Bot berhasil terhubung ke WhatsApp!');
            
            // Set interval untuk mengecek email setiap 1 menit (60000 ms)
            setInterval(() => {
                // checkEmails(sock).catch(err => console.error("[EMAIL CHECKER] Gagal cek email: ", err));
            }, 60000);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        // Abaikan pesan dari status/story
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        // Abaikan pesan dari bot sendiri (kecuali mau bikin fitur tertentu)
        if (msg.key.fromMe) return;

        // Routing Pesan
        await handleIncomingMessage(sock, msg);
    });

    // SISTEM RANDOM EVENT (Otomatis cek setiap 1 menit) - DIMATIKAN SEMENTARA SESUAI PERMINTAAN
    /*
    const { triggerRandomEvent } = require('./handlers/rpg/randomEventHandler');
    setInterval(() => {
        const notifGroups = [
            "120363161911228513@g.us", // Grup Animelovers
            "120363430534659760@g.us"  // Grup Yukino Fih
        ]; // Daftar grup yang dikasih notif (bisa dikosongin kalau ga mau spam)
        
        // Cek Random Event
        triggerRandomEvent(sock, notifGroups);
        
    }, 60000); // 60,000 ms = 1 menit
    */
}

async function handleIncomingMessage(sock, msg) {
    try {
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        // Menentukan pengirim yang sebenarnya
        let sender = isGroup ? msg.key.participant : from;
        
        // Memastikan selalu menggunakan JID pengirim aslinya (bukan LID yang diawali 1400)
        if (msg.key.fromMe) {
            sender = sock.user.id;
        } else if (!isGroup && msg.key.participant) {
            sender = msg.key.participant;
        }

        // === IMPLEMENTASI RESOLUSI LID (LID MAPPING BAWAAN BAILEYS) ===
        // Memaksa pengubahan LID menjadi Phone Number Asli di seluruh sistem bot.
        if (sender && sender.endsWith('@lid')) {
            try {
                const pn = await sock.signalRepository.lidMapping.getPNForLID(sender);
                if (pn) {
                    sender = pn;
                }
            } catch (err) {
                console.error('[WARNING] Gagal me-resolve LID menjadi Phone Number:', err);
            }
        }
        
        // Membersihkan ujung JID yang aneh (misal ada titik koma atau : bawaan multi-device)
        if (sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        const pushName = msg.pushName || 'User';

        // === FITUR AFK (Pengecekan Otomatis Setiap Pesan) ===
        // 1. Jika ada orang ngetag member yang sedang AFK
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJid.length > 0) {
            for (let jid of mentionedJid) {
                // Bersihkan target LID mapping juga untuk ngecek AFK-nya
                if (jid.endsWith('@lid')) {
                    try {
                        const pnTarget = await sock.signalRepository.lidMapping.getPNForLID(jid);
                        if (pnTarget) jid = pnTarget;
                    } catch (e) {}
                }
                if (jid.includes(':')) jid = jid.split(':')[0] + '@s.whatsapp.net';

                const afkUser = checkAfk(jid);
                if (afkUser) {
                    const durasi = Math.floor((Date.now() - afkUser.time) / 60000); // dalam menit
                    let waktuTeks = `${durasi} menit`;
                    if (durasi >= 60) {
                        const jam = Math.floor(durasi / 60);
                        const sisaMenit = durasi % 60;
                        waktuTeks = `${jam} jam ${sisaMenit} menit`;
                    } else if (durasi === 0) {
                        waktuTeks = `baru saja`;
                    }
                    await sock.sendMessage(from, { text: `Ssstt... Jangan tag dia yaa 🤫\nDia lagi *AFK* sejak *${waktuTeks}* yang lalu!\n\nAlasan: ${afkUser.reason}` }, { quoted: msg });
                }
            }
        }

        // 2. Jika member yang AFK mengirim pesan, otomatis cabut status AFK-nya
        const afkDataUser = checkAfk(sender);
        if (afkDataUser && removeAfk(sender)) {
            const durasiAfk = Math.floor((Date.now() - afkDataUser.time) / 60000);
            let waktuTeks = `${durasiAfk} menit`;
            if (durasiAfk >= 60) {
                const jam = Math.floor(durasiAfk / 60);
                const sisaMenit = durasiAfk % 60;
                waktuTeks = `${jam} jam ${sisaMenit} menit`;
            } else if (durasiAfk === 0) {
                waktuTeks = `kurang dari semenit`;
            }
            await sock.sendMessage(from, { text: `Selamat datang kembali, *${pushName}*! 💜\nStatus AFK kamu telah dihapus karena kamu sudah aktif lagi.\n\nKamu tadi AFK selama: *${waktuTeks}*.` }, { quoted: msg });
        }

        // Mendapatkan isi pesan (Text biasa, Extended, Image caption, dll)
        const type = Object.keys(msg.message)[0];
        const body = (type === 'conversation' && msg.message.conversation) ? msg.message.conversation
            : (type === 'imageMessage' && msg.message.imageMessage.caption) ? msg.message.imageMessage.caption
            : (type === 'videoMessage' && msg.message.videoMessage.caption) ? msg.message.videoMessage.caption
            : (type === 'extendedTextMessage' && msg.message.extendedTextMessage.text) ? msg.message.extendedTextMessage.text
            : '';

        const isStickerMsg = type === 'stickerMessage';
        const isImageWithoutCaption = type === 'imageMessage' && !body;

        if (!body && !isStickerMsg && !isImageWithoutCaption) return; // Jika pesan kosong non-media, diabaikan

        // Rekam context jika ini adalah pesan grup, apapun teksnya (termasuk yang tidak pakai prefix)
        if (isGroup && pushName && body) {
            addGroupContext(from, pushName, body);
        }

        // Cek interaksi media langsung di private chat (jika kirim gambar/stiker tanpa prefix di DM)
        const isDirectMediaToYuki = (!isGroup && (isStickerMsg || isImageWithoutCaption));

        if (!body.startsWith('!') || isDirectMediaToYuki) {
            // --- Cek Panggilan ke AI (Yuki/Yukino) atau kirim media di Private Chat ---
            const lowerBody = body.toLowerCase();
            const isMentioningYuki = lowerBody.includes('yuki') || lowerBody.includes('yukino') || isDirectMediaToYuki;

            if (isMentioningYuki) {
                // Cek jika user kena ban khusus AI
                if (isUserRegistered(sender)) {
                    const userData = getUser(sender);
                    if (userData && userData.isAiBanned === 1 && !msg.key.fromMe && !sender.includes('6281292744550')) {
                        return sock.sendMessage(from, { text: '🤖 Maaf ya, akses kamu buat ngobrol sama AI Yuki lagi ditutup sementara sama Owner.' }, { quoted: msg });
                    }
                }
                
                // Hapus kata panggilan agar pertanyaan intinya saja yang tersisa (opsional, tapi lebih natural dibiarkan)
                return await handleTanyaAI(sock, msg, from, sender, body);
            }

            // Cek apakah user membalas pesan tebak kata
            const isTebakKata = await checkTebakKata(sock, msg, from, lowerBody);
            if (isTebakKata) return;
            
            // --- Sistem EXP Otomatis per Pesan ---
            if (isUserRegistered(sender)) {
                const levelUpMsg = addExp(sender, 1);
                if (levelUpMsg) {
                    await sock.sendMessage(from, { text: `🎉 ${levelUpMsg}` }, { quoted: msg });
                }
            }
            return;
        }

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        console.log(`[CMD] ${pushName} (${sender}): ${command}`);

        // Berikan EXP untuk setiap command yang valid (kalau sudah terdaftar)
        if (isUserRegistered(sender)) {
            const newLevel = addExp(sender, 5); // 5 EXP per command
            if (newLevel) {
                await sock.sendMessage(from, { text: `🎉 Selamat @${sender.split('@')[0]}! Kamu naik ke *Level ${newLevel}*! 🥳`, mentions: [sender] });
            }
        }

        // Routing Command
        if (command === 'ping') {
            await sock.sendMessage(from, { text: 'Pong! Bot aktif 💜' }, { quoted: msg });
        } else if (command === 'menu') {
            await handleMenu(sock, msg, from, sender, pushName);
        } else if (command === 'regist' || command === 'register') {
            await handleRegister(sock, msg, from, sender, args);
        } else if (command === 'profil' || command === 'profile') {
            await handleProfile(sock, msg, from, sender);
        } else if (command === 'setbg' || command === 'setbackground') {
            await handleSetBackground(sock, msg, from, sender, args);
        } else if (command === 'inv' || command === 'inventory') {
            await handleInventory(sock, msg, from, sender);
        } else if (command === 'daily') {
            await handleDaily(sock, msg, from, sender);
        } else if (command === 'mancing') {
            await handleFishing(sock, msg, from, sender, args);
        } else if (command === 'shop' || command === 'toko') {
            await handleShop(sock, msg, from, sender);
        } else if (command === 'beli') {
            await handleBuy(sock, msg, from, sender, args);
        } else if (command === 'jual') {
            await handleSell(sock, msg, from, sender, args);
        } else if (command === 'pakai' || command === 'use') {
            await handleUseItem(sock, msg, from, sender, args);
        } else if (command === 'petualang' || command === 'adventure') {
            await handleAdventure(sock, msg, from, sender);
        } else if (command === 'lawan' || command === 'battle') {
            await handleBattle(sock, msg, from, sender);
        } else if (command === 'gacha') {
            await handleGacha(sock, msg, from, sender, args);
        } else if (command === 'gift') {
            await handleGift(sock, msg, from, sender, args);
        } else if (command === 'transfer' || command === 'tf' || command === 'pay') {
            await handleTransfer(sock, msg, from, sender, args);
        } else if (command === 'bank' || command === 'nabung' || command === 'tarik') {
            const bankArgs = command === 'bank' ? args : [command, ...args];
            await handleBank(sock, msg, from, sender, bankArgs);
        } else if (command === 'cf' || command === 'coinflip') {
            await handleCoinFlip(sock, msg, from, sender, args);
        } else if (command === 'slot') {
            await handleSlot(sock, msg, from, sender, args);
        } else if (command === 'addgold') {
            await handleAddGold(sock, msg, from, sender, args);
        } else if (command === 'addgoldall') {
            await handleAddGoldAll(sock, msg, from, sender, args);
        } else if (command === 'takegold' || command === 'tarikgold') {
            await handleTakeGold(sock, msg, from, sender, args);
        } else if (command === 'ttt' || command === 'tictactoe') {
            await handleTicTacToe(sock, msg, from, sender, args);
        } else if (command === 'ban') {
            await handleBanUser(sock, msg, from, sender, args, true, false);
        } else if (command === 'unban') {
            await handleBanUser(sock, msg, from, sender, args, false, false);
        } else if (command === 'banai') {
            await handleBanUser(sock, msg, from, sender, args, true, true);
        } else if (command === 'unbanai') {
            await handleBanUser(sock, msg, from, sender, args, false, true);
        } else if (command === 'listikan' || command === 'ikan') {
            await handleFishList(sock, msg, from, sender);
        } else if (command === 'index' || command === 'fishindex' || command === 'indexikan' || command === 'koleksi') {
            await handleFishIndex(sock, msg, from, sender, args);
        } else if (command === 'indexpet' || command === 'petindex' || command === 'koleksipet') {
            await handlePetIndex(sock, msg, from, sender, args);
        } else if (command === 'pet' || command === 'pets' || command === 'zoo' || command === 'kandang') {
            await handlePet(sock, msg, from, sender, args);
        } else if (command === 'farm' || command === 'ladang') {
            await handleFarm(sock, msg, from, sender, args);
        } else if (command === 'tanam') {
            await handleFarm(sock, msg, from, sender, args, 'tanam');
        } else if (command === 'panen') {
            await handleFarm(sock, msg, from, sender, args, 'panen');
        } else if (command === 'duel') {
            await handleDuel(sock, msg, from, sender, args);
        } else if (command === 'job' || command === 'kerja') {
            await handleJob(sock, msg, from, sender, args);
        } else if (command === 'leaderboard' || command === 'lb') {
            await handleLeaderboard(sock, msg, from, sender);
        } else if (command === 'listuser') {
            await handleListUsers(sock, msg, from, sender);
        } else if (command === 'exec' || command === 'terminal' || command === 'sh' || command === 'cmd') {
            await handleTerminalExec(sock, msg, from, sender, args);
        } else if (command === 'event') {
            await handleEventAdmin(sock, msg, from, sender, args);
        } else if (command === 'afk') {
            const reason = args.join(' ') || 'Tanpa alasan';
            setAfk(sender, reason);
            await sock.sendMessage(from, { text: `💤 *${pushName}* sekarang sedang AFK.\n\nAlasan: ${reason}` }, { quoted: msg });
        } else if (['katabijak', 'hinarisky', 'kamus', 'haribesar', 'ayat'].includes(command)) {
            await handleEdukasi(sock, msg, from, sender, command, args);
        } else if (command === 'tebakkata') {
            await handleTebakKata(sock, msg, from, sender);
        } else if (command === 'sticker' || command === 'stiker') {
            await handleSticker(sock, msg, from);
        } else if (command === 'brat') {
            await handleBratSticker(sock, msg, from, args.join(" "));
        } else if (command === 'gif') {
            const query = args.join(' ') || 'anime cute';
            const sent = await sendGiphy(sock, from, query, `✨ GIF: *${query}*`, msg);
            if (!sent) {
                await sock.sendMessage(from, { text: '🥺 Maaf ya, Yuki nggak nemu GIF buat kata kunci itu.' }, { quoted: msg });
            }
        } else if (['tt', 'tiktok', 'yt', 'youtube'].includes(command)) {
            await handleDownloader(sock, msg, from, command, args);
        } else if (command === 'tanya' || command === 'ai' || command === 'ask') {
            // Cek jika user kena ban khusus AI
            if (isUserRegistered(sender)) {
                const userData = getUser(sender);
                if (userData && userData.isAiBanned === 1 && !msg.key.fromMe && !sender.includes('6281292744550')) {
                    return sock.sendMessage(from, { text: '🤖 Maaf ya, akses kamu buat ngobrol sama AI Yuki lagi ditutup sementara sama Owner.' }, { quoted: msg });
                }
            }
            await handleTanyaAI(sock, msg, from, sender, args.join(" "));
        }
    } catch (error) {
        console.error('[ERROR] handleIncomingMessage:', error);
    }
}

startBot();