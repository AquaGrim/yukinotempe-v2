const fs = require('fs');
const path = require('path');

const eventPath = path.join(__dirname, '../data/eventData.json');

// Buat file kalau belum ada
if (!fs.existsSync(eventPath)) {
    fs.writeFileSync(eventPath, JSON.stringify({ active: false }));
}

function getEventData() {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
}

function setEvent(multiplierStr, durasiMenit, luckMultiplierStr) {
    const multi = parseFloat(multiplierStr) || 1;
    const luck = parseFloat(luckMultiplierStr) || 1;
    const durasi = parseFloat(durasiMenit) || 1;

    const expiredAt = Date.now() + (durasi * 60000); // Konversi menit ke millisecond

    const data = {
        active: true,
        priceMultiplier: multi,
        luckMultiplier: luck,
        expiredAt: expiredAt
    };

    fs.writeFileSync(eventPath, JSON.stringify(data, null, 2));
    return data;
}

function clearEvent() {
    fs.writeFileSync(eventPath, JSON.stringify({ active: false }));
}

function checkActiveEvent() {
    const data = getEventData();
    if (data.active) {
        if (Date.now() > data.expiredAt) {
            clearEvent();
            return { active: false };
        }
        return data;
    }
    return { active: false };
}

module.exports = {
    getEventData,
    setEvent,
    clearEvent,
    checkActiveEvent
};