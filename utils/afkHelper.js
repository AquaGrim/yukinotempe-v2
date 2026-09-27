const fs = require('fs');
const path = require('path');

const afkFilePath = path.join(__dirname, '../database/afk.json');

// Membaca data AFK dari file
function getAfkData() {
    try {
        if (!fs.existsSync(afkFilePath)) {
            fs.writeFileSync(afkFilePath, JSON.stringify({}));
        }
        const data = fs.readFileSync(afkFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('[ERROR] Gagal membaca afk.json', err);
        return {};
    }
}

// Menyimpan data AFK ke file
function saveAfkData(data) {
    try {
        fs.writeFileSync(afkFilePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[ERROR] Gagal menyimpan afk.json', err);
    }
}

// Menambah status AFK
function setAfk(sender, reason) {
    const data = getAfkData();
    data[sender] = {
        reason: reason || 'Tanpa alasan',
        time: Date.now()
    };
    saveAfkData(data);
}

// Menghapus status AFK
function removeAfk(sender) {
    const data = getAfkData();
    if (data[sender]) {
        delete data[sender];
        saveAfkData(data);
        return true;
    }
    return false;
}

// Mendapatkan data AFK satu user
function checkAfk(sender) {
    const data = getAfkData();
    return data[sender] || null;
}

module.exports = {
    getAfkData,
    setAfk,
    removeAfk,
    checkAfk
};
