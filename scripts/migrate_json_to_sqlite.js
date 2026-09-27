const fs = require('fs');
const path = require('path');
const { saveUsers } = require('../utils/databaseHelper');

const oldDbPath = path.join(__dirname, '../database/users.json');

async function migrate() {
    if (fs.existsSync(oldDbPath)) {
        console.log('[MIGRASI] Menemukan users.json lama, memulai migrasi ke SQLite...');
        const rawData = fs.readFileSync(oldDbPath, 'utf8');
        try {
            const oldUsers = JSON.parse(rawData);
            saveUsers(oldUsers);
            console.log('[MIGRASI] Migrasi sukses! Merename file users.json menjadi users.json.backup');
            fs.renameSync(oldDbPath, oldDbPath + '.backup');
        } catch(e) {
            console.error('[MIGRASI] Gagal memparsing JSON lama:', e);
        }
    } else {
        console.log('[MIGRASI] Tidak menemukan users.json lama (Sudah bersih).');
    }
}

migrate();
