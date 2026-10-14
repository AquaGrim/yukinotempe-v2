const { checkActiveEvent, setEvent, clearEvent } = require('../../utils/eventHelper');

// Daftar Random Event
const eventsList = [
    { name: "Festival Ikan 🐟", type: "fishing", durasiMenit: 10, luck: 2.5, multiplier: 1, desc: "Peluang dapat ikan Legend meningkat pesat selama 10 menit!" },
    { name: "Pasar Malam 🌙", type: "shop", durasiMenit: 5, luck: 1, multiplier: 0.5, desc: "Diskon 50% untuk semua harga di Toko selama 5 menit!" },
    { name: "Gacha Fever 🎰", type: "gacha", durasiMenit: 10, luck: 3.0, multiplier: 1, desc: "Rate karakter SSR / Anime Gacha naik 3x lipat selama 10 menit!" },
    { name: "Masa Paceklik 🍂", type: "debuff", durasiMenit: 15, luck: 0.5, multiplier: 2, desc: "Semua harga naik 2x lipat dan keberuntungan turun drastis selama 15 menit!" }
];

function triggerRandomEvent(sock, targetJids = []) {
    // 5% chance setiap kali ditrigger (misal per menit)
    if (Math.random() > 0.05) return; 

    const active = checkActiveEvent();
    if (active.active) return; // Jangan timpa kalau ada event

    const evt = eventsList[Math.floor(Math.random() * eventsList.length)];
    
    // Convert menit ke jam (durasiJam)
    setEvent(evt.multiplier, evt.durasiMenit / 60, evt.luck);

    const announcement = `📢 *[EVENT MENDADAK]* 📢\n\n✨ **${evt.name}** ✨\n\n📝 _${evt.desc}_\n\n⏳ Event ini akan berlangsung selama *${evt.durasiMenit} Menit*!\nAyo manfaatkan sebaik-baiknya!`;

    // Opsional: Ngirim notifikasi ke grup-grup / user
    if (targetJids && targetJids.length > 0) {
        targetJids.forEach(jid => {
            sock.sendMessage(jid, { text: announcement }).catch(() => {});
        });
    }
}

module.exports = { triggerRandomEvent };
