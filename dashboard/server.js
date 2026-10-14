const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');
const { getUsers, saveUsers, db } = require('../utils/databaseHelper');

function startDashboard() {
    const app = express();
    const port = process.env.DASHBOARD_PORT || 3000;

    // Set view engine ke EJS
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Parse form data dari website
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    const adminAuth = basicAuth({
        users: { 'yukiadmin': 'sayangzeta123' },
        challenge: true,
        realm: 'Yukinotempe Dashboard'
    });

    // Data background anime dipanggil langsung dari storage lokal (/images/bg)
    const backgroundMap = {
        "Kazuha": "/images/bg/Kazuha.jpg",
        "Furina": [
            "/images/bg/furina_processed/furina_1.jpg",
            "/images/bg/furina_processed/furina_2.jpg",
            "/images/bg/furina_processed/furina_3.jpg",
            "/images/bg/furina_processed/furina_4.jpg",
            "/images/bg/furina_processed/furina_5.jpg",
            "/images/bg/furina_processed/furina_6.jpg",
            "/images/bg/furina_processed/furina_7.jpg"
        ],
        "Raiden Shogun": "/images/bg/RaidenShogun.jpg",
        "Kamisato Ayato": "/images/bg/KamisatoAyato.jpg",
        "Tartaglia": "/images/bg/Tartaglia.jpg",
        "Vestia Zeta": [
            "/images/bg/zeta_processed/zeta_1.jpg",
            "/images/bg/zeta_processed/zeta_2.jpg",
            "/images/bg/zeta_processed/zeta_3.jpg",
            "/images/bg/zeta_processed/zeta_4.jpg",
            "/images/bg/zeta_processed/zeta_5.jpg",
            "/images/bg/zeta_processed/zeta_6.jpg",
            "/images/bg/zeta_processed/zeta_7.jpg",
            "/images/bg/zeta_processed/zeta_8.jpg"
        ],
        "Sakura": "/images/bg/Sakura.jpg",
        "Mythia Batford": "/images/bg/MythiaBatford.jpg",
        "Gwar Gura": "/images/bg/GwarGura.jpg",
        "Monkey D. Luffy": "/images/bg/MonkeyDLuffy.jpg",
        "Nephie Phelia": "/images/bg/NephiePhelia.jpg"
    };

    // Helper untuk memilih gambar background (acak jika berupa kumpulan gambar/array)
    function resolveBackground(bgKey) {
        if (!bgKey || !backgroundMap[bgKey]) return null;
        const entry = backgroundMap[bgKey];
        if (Array.isArray(entry)) {
            const randomIndex = Math.floor(Math.random() * entry.length);
            return entry[randomIndex];
        }
        return entry;
    }

    // Endpoint Publik: Halaman Profil Pemain (Aesthetic RPG Profile)
    app.get('/player/:id', (req, res) => {
        const users = getUsers();
        let targetId = req.params.id;
        
        // Coba cocokan nomor dengan akhiran @s.whatsapp.net jika belum ada
        if (!users[targetId]) {
            if (users[targetId + '@s.whatsapp.net']) {
                targetId = targetId + '@s.whatsapp.net';
            } else {
                return res.status(404).send("Pemain tidak ditemukan atau belum terdaftar 🥺");
            }
        }
        
        const player = users[targetId];
        
        // Ambil background yang sudah dikunci (fixed) dari inventory player
        let bgUrl = null;
        if (player && player.inventory) {
            if (player.inventory.active_background_image) {
                bgUrl = player.inventory.active_background_image;
            } else if (player.inventory.active_background) {
                bgUrl = resolveBackground(player.inventory.active_background);
            }
        }
        
        res.render('profile', { 
            playerId: targetId,
            player: player,
            bgUrl: bgUrl
        });
    });

    // Halaman Admin: Menampilkan Statistik dan Daftar Pemain (Dilindungi Sandi)
    app.get('/', adminAuth, (req, res) => {
        const users = getUsers();
        const playerList = Object.keys(users).map(id => ({
            id,
            name: users[id].name,
            level: users[id].level || 1,
            money: users[id].money || 0,
            bank: users[id].bank || 0,
            isBanned: users[id].isBanned || 0,
            isAiBanned: users[id].isAiBanned || 0
        })).sort((a, b) => b.level - a.level); // Urut berdasarkan Level

        const totalGold = playerList.reduce((acc, curr) => acc + curr.money + curr.bank, 0);

        res.render('index', { 
            players: playerList, 
            totalPlayers: playerList.length,
            totalGold: totalGold
        });
    });

    // Action: Tambah Uang
    app.post('/addgold', adminAuth, (req, res) => {
        const { targetId, amount } = req.body;
        if (targetId && amount) {
            const users = getUsers();
            if (users[targetId]) {
                users[targetId].money += parseInt(amount);
                saveUsers({ [targetId]: users[targetId] });
            }
        }
        res.redirect('/');
    });

    // Action: Ban/Unban Global Bot
    app.post('/toggleban', adminAuth, (req, res) => {
        const { targetId, status } = req.body;
        if (targetId) {
            const users = getUsers();
            if (users[targetId]) {
                users[targetId].isBanned = parseInt(status);
                saveUsers({ [targetId]: users[targetId] });
            }
        }
        res.redirect('/');
    });

    app.listen(port, () => {
        console.log(`[DASHBOARD] Yukinotempe Admin Panel berjalan di http://localhost:${port}`);
    });
}

module.exports = { startDashboard };