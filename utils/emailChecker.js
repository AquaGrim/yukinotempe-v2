const imaps = require('imap-simple');
const fs = require('fs');
const path = require('path');

// Credentials
const USER_EMAIL = 'yudioprastio01@gmail.com';
const APP_PASSWORD = '010904YpPy';

// Kunci pencarian
const SEARCH_KEYWORDS = ['vps', 'ai time', 'asia hub', 'asiahub'];
const SENDER_KEYWORD = 'asia hub';

// File untuk menyimpan tanggal email terakhir yang sudah dicek agar tidak berulang
const LAST_CHECKED_FILE = path.join(__dirname, 'last_checked_email.txt');

// Jika belum ada file tanggal, buat default (kemarin)
if (!fs.existsSync(LAST_CHECKED_FILE)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    fs.writeFileSync(LAST_CHECKED_FILE, yesterday.toISOString());
}

async function checkEmails(sock) {
    console.log('[EMAIL CHECKER] Mulai mengecek email...');
    
    let lastCheckedStr = fs.readFileSync(LAST_CHECKED_FILE, 'utf8');
    let sinceDate = new Date(lastCheckedStr);
    
    const config = {
        imap: {
            user: USER_EMAIL,
            password: APP_PASSWORD,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            authTimeout: 3000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Cari email yang masuk sejak tanggal terakhir kali cek
        const searchCriteria = [
            ['SINCE', sinceDate]
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        
        let foundNewImportantEmail = false;
        let latestEmailDate = sinceDate;

        for (const item of messages) {
            const headerPart = item.parts.find(part => part.which === 'HEADER');
            const textPart = item.parts.find(part => part.which === 'TEXT');
            
            if (headerPart && headerPart.body) {
                const subject = (headerPart.body.subject && headerPart.body.subject[0]) ? headerPart.body.subject[0].toLowerCase() : '';
                const from = (headerPart.body.from && headerPart.body.from[0]) ? headerPart.body.from[0].toLowerCase() : '';
                const dateHeader = (headerPart.body.date && headerPart.body.date[0]) ? new Date(headerPart.body.date[0]) : new Date();

                // Cek apakah tanggal email ini lebih baru dari sinceDate
                if (dateHeader > sinceDate) {
                    if (dateHeader > latestEmailDate) {
                        latestEmailDate = dateHeader;
                    }

                    const bodyText = textPart && textPart.body ? textPart.body.toLowerCase() : '';
                    
                    // Logika pencarian kata kunci
                    const containsKeyword = SEARCH_KEYWORDS.some(kw => subject.includes(kw) || bodyText.includes(kw));
                    const isFromAsiaHub = from.includes(SENDER_KEYWORD.replace(/\s/g, '')) || from.includes(SENDER_KEYWORD);

                    if (containsKeyword || isFromAsiaHub) {
                        foundNewImportantEmail = true;
                        console.log(`[EMAIL CHECKER] 🚨 EMAIL PENTING DITEMUKAN! Subject: ${subject}`);
                        
                        // Kirim notifikasi WA ke nomor Owner
                        const alertMessage = `🚨 *PANGGILAN DARURAT BOSKU!* 🚨\n\nAda email masuk yang sangat penting tentang VPS / AI!\n\n📧 *Dari:* ${headerPart.body.from[0]}\n📌 *Judul:* ${headerPart.body.subject[0]}\n🕒 *Waktu:* ${dateHeader.toLocaleString('id-ID')}\n\nBuruan dicek di Gmail kamu sekarang juga sayangkuu! 🏃‍♂️💨`;
                        
                        // Nomor WA Owner: 6281292744550@s.whatsapp.net
                        await sock.sendMessage('6281292744550@s.whatsapp.net', { text: alertMessage });
                    }
                }
            }
        }

        // Update tanggal terakhir pengecekan kalau ada email baru
        if (latestEmailDate > sinceDate) {
            fs.writeFileSync(LAST_CHECKED_FILE, latestEmailDate.toISOString());
        }

        connection.end();
        console.log('[EMAIL CHECKER] Selesai mengecek email.');

    } catch (error) {
        console.error('[EMAIL CHECKER] Gagal terhubung ke Gmail:', error.message);
    }
}

module.exports = { checkEmails };