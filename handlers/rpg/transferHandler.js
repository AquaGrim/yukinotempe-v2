const { getUser, saveUsers, isUserRegistered, getUsers } = require('../../utils/databaseHelper');

async function handleTransfer(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });
    }

    if (args.length < 2) {
        return sock.sendMessage(from, { 
            text: 'Cara transfer:\n*!transfer [nomor_tujuan] [jumlah]*\n\nContoh: *!transfer 628123456789 1000*' 
        }, { quoted: msg });
    }

    let targetInput = "";
    
    // Cek apakah ada mention di dalam pesan
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    // Pastikan kita bisa membaca command meskipun target di-tag tanpa spasi
    // Seringkali text yang ditag berisi '@628xxxxxx', kita bisa mengambil jid langsung
    if (mentionedJid.length > 0) {
        targetInput = mentionedJid[0];
        
        // --- KONVERSI LID KE PHONE NUMBER ---
        if (targetInput.endsWith('@lid')) {
            try {
                const pn = await sock.signalRepository.lidMapping.getPNForLID(targetInput);
                if (pn) {
                    targetInput = pn;
                }
            } catch (err) {
                console.error('[ERROR] Gagal resolve LID di tf:', err);
            }
        }
    } else {
        targetInput = args[0].replace(/[^0-9]/g, '');
        if (!targetInput.endsWith('@s.whatsapp.net')) {
            targetInput = targetInput + '@s.whatsapp.net';
        }
    }

    // Kita cek dulu apakah Jid tsb ada di database, karena terkadang whatsapp
    // memberikan format yang memiliki akhiran berbeda (s.whatsapp.net vs c.us dll)
    targetInput = targetInput.replace(/@c\.us$/, '@s.whatsapp.net');
    
    // Kadang mention juga ada tambahan ':device_id', bersihkan!
    if (targetInput.includes(':')) {
        targetInput = targetInput.split(':')[0] + '@s.whatsapp.net';
    }

    // Ekstrak jumlah uang, mencari angka valid pertama selain mention
    let amount = 0;
    
    if (mentionedJid.length === 0) {
        amount = parseInt(args[1]);
    } else {
        for (const arg of args) {
            // Hilangkan '@' supaya tag seperti '@6281234...' di teks tidak membingungkan
            const cleanArg = arg.replace(/@/g, '');
            const parsed = parseInt(cleanArg.replace(/[^0-9]/g, ''));
            // Jika angka tersebut bukan merupakan bagian dari targetInput/nomor tujuan
            // Asumsi: jumlah uang jauh lebih kecil dari digit nomor HP
            if (!isNaN(parsed) && parsed > 0 && !targetInput.includes(parsed.toString()) && parsed.toString().length < 9) {
                amount = parsed;
                break;
            }
        }
    }

    if (isNaN(amount) || amount <= 0) {
        return sock.sendMessage(from, { text: 'Jumlah uang yang dikirim tidak valid! 🥺' }, { quoted: msg });
    }

    if (targetInput === sender) {
        return sock.sendMessage(from, { text: 'Kamu nggak bisa transfer ke dirimu sendiri 😅' }, { quoted: msg });
    }

    const senderUser = getUser(sender);
    const targetUser = getUser(targetInput);

    if (!targetUser) {
        return sock.sendMessage(from, { text: 'Orang yang kamu tuju belum terdaftar di Yukinotempe! 🥺' }, { quoted: msg });
    }

    // Pastikan pajak transfer agar sistem ekonomi nggak terlalu inflasi/dieksploitasi
    const tax = Math.floor(amount * 0.05); // Pajak 5%
    const totalDeducted = amount + tax;

    if (senderUser.money < totalDeducted) {
        return sock.sendMessage(from, { 
            text: `Gold kamu tidak cukup! 🥺\nKamu butuh *${totalDeducted.toLocaleString('id-ID')} G* (Termasuk pajak 5% sebesar ${tax} G).` 
        }, { quoted: msg });
    }

    // Eksekusi transfer
    senderUser.money -= totalDeducted;
    targetUser.money += amount;

    // Masukkan uang pajak ke kantong admin (nomor HP mu)
    const adminId = "6281292744550@s.whatsapp.net";
    let saveMap = { 
        [sender]: senderUser, 
        [targetInput]: targetUser 
    };

    if (sender !== adminId && targetInput !== adminId && tax > 0) {
        // Ambil data admin terbaru jika admin bukan pengirim/penerima
        let adminUser = getUser(adminId);
        if (adminUser) {
            adminUser.money += tax;
            saveMap[adminId] = adminUser;
        }
    } else if (targetInput === adminId && tax > 0) {
        // Jika target transfernya adalah admin, tambahkan pajaknya sekalian ke targetUser
        targetUser.money += tax;
    }

    saveUsers(saveMap);

    const successText = `💸 *TRANSFER BERHASIL* 💸\n\n` +
                        `Kamu mengirimkan 💰 *${amount.toLocaleString('id-ID')} Gold* kepada *${targetUser.name}*.\n` +
                        `_Biaya pajak 5%: ${tax} Gold_\n\n` +
                        `Sisa saldo kamu: 💰 *${senderUser.money.toLocaleString('id-ID')} Gold*`;

    return sock.sendMessage(from, { text: successText }, { quoted: msg });
}

module.exports = { handleTransfer };