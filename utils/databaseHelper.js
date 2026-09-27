const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../database/users.db');
const db = new Database(dbPath);

// Inisialisasi tabel jika belum ada
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        age INTEGER,
        money INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        inventory TEXT DEFAULT '{}',
        lastDaily INTEGER,
        registeredAt TEXT,
        isBanned INTEGER DEFAULT 0,
        isAiBanned INTEGER DEFAULT 0
    )
`);

// Mendaftarkan user baru
function registerUser(sender, name, age) {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(sender);
    if (existing) return false;

    const stmt = db.prepare(`
        INSERT INTO users (id, name, age, money, level, exp, inventory, registeredAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(sender, name, age, 0, 1, 0, '{}', new Date().toISOString());
    return true;
}

// Mengecek apakah user sudah terdaftar
function isUserRegistered(sender) {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(sender);
    return !!existing;
}

// Mendapatkan data satu user
function getUser(sender) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(sender);
    if (user) {
        user.inventory = JSON.parse(user.inventory || '{}');
        
        // Handle Stamina System (Max 10 + 1 per 10 level)
        const maxStamina = 10 + Math.floor((user.level || 1) / 10);
        let currentStamina = user.inventory.stamina !== undefined ? user.inventory.stamina : maxStamina;
        const lastRegen = user.inventory.lastStaminaRegen || Date.now();
        const now = Date.now();
        
        // Regenerasi 1 stamina per 10 menit (600,000 ms)
        if (currentStamina < maxStamina && now > lastRegen) {
            const timeDiff = now - lastRegen;
            const staminaToRecover = Math.floor(timeDiff / 600000);
            
            if (staminaToRecover > 0) {
                currentStamina += staminaToRecover;
                if (currentStamina > maxStamina) currentStamina = maxStamina;
                
                // Update waktu terakhir regen
                user.inventory.lastStaminaRegen = lastRegen + (staminaToRecover * 600000);
            }
        } else if (currentStamina >= maxStamina) {
            user.inventory.lastStaminaRegen = now; // Reset timer kalau udah penuh
        }
        
        user.inventory.stamina = currentStamina;
        user.stamina = currentStamina;
        user.maxStamina = maxStamina;
    }
    return user;
}

// [BACKWARD COMPATIBILITY] 
// Mengambil semua user (Hanya digunakan jika ada fungsi lama yang terlanjur minta semua data user secara bulk)
function getUsers() {
    const users = db.prepare('SELECT * FROM users').all();
    let result = {};
    const now = Date.now();
    users.forEach(u => {
        u.inventory = JSON.parse(u.inventory || '{}');
        
        // Handle Stamina System
        const maxStamina = 10 + Math.floor((u.level || 1) / 10);
        let currentStamina = u.inventory.stamina !== undefined ? u.inventory.stamina : maxStamina;
        const lastRegen = u.inventory.lastStaminaRegen || now;
        
        if (currentStamina < maxStamina && now > lastRegen) {
            const timeDiff = now - lastRegen;
            const staminaToRecover = Math.floor(timeDiff / 600000); // 1 per 10 menit
            
            if (staminaToRecover > 0) {
                currentStamina += staminaToRecover;
                if (currentStamina > maxStamina) currentStamina = maxStamina;
                u.inventory.lastStaminaRegen = lastRegen + (staminaToRecover * 600000);
            }
        } else if (currentStamina >= maxStamina) {
            u.inventory.lastStaminaRegen = now;
        }
        
        u.inventory.stamina = currentStamina;
        u.stamina = currentStamina;
        u.maxStamina = maxStamina;

        result[u.id] = u;
    });
    return result;
}

// [BACKWARD COMPATIBILITY]
// Menyimpan semua user secara bulk (Untuk mendukung gaya penyimpanan kode lama JSON sementara waktu)
function saveUsers(usersObject) {
    if (!usersObject) return;
    const stmt = db.prepare(`
        UPDATE users 
        SET name = ?, age = ?, money = ?, level = ?, exp = ?, inventory = ?, lastDaily = ?, registeredAt = ?, isBanned = ?, isAiBanned = ?
        WHERE id = ?
    `);
    
    const insertStmt = db.prepare(`
        INSERT INTO users (id, name, age, money, level, exp, inventory, lastDaily, registeredAt, isBanned, isAiBanned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Pakai transaksi supaya lebih cepat
    const transaction = db.transaction((usersMap) => {
        for (const [id, u] of Object.entries(usersMap)) {
            const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
            const invString = JSON.stringify(u.inventory || {});
            const isBanned = u.isBanned || 0;
            const isAiBanned = u.isAiBanned || 0;
            
            if (exists) {
                stmt.run(u.name, u.age, u.money, u.level, u.exp, invString, u.lastDaily, u.registeredAt, isBanned, isAiBanned, id);
            } else {
                insertStmt.run(id, u.name, u.age, u.money, u.level, u.exp, invString, u.lastDaily, u.registeredAt, isBanned, isAiBanned);
            }
        }
    });
    transaction(usersObject);
}

module.exports = {
    db,
    registerUser,
    isUserRegistered,
    getUser,
    getUsers, // Dipertahankan untuk kode lama yang belum direfactor total
    saveUsers // Dipertahankan untuk kode lama
};
