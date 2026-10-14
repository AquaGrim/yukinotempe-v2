const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const fishList = require('../../data/fishData');

const shopItems = {
    // Kategori: Consumable
    potion: { name: "Potion", price: 1000, desc: "+3 Stamina" },
    buff: { name: "Buff Scroll", price: 75, desc: "+25% peluang menang battle" },
    expbook: { name: "Exp Book", price: 150, desc: "+50 EXP" },
    namecard: { name: "Kartu Ganti Nama", price: 100000, desc: "Ganti nama karakter kamu (!pakai namecard [NamaBaru])" },
    
    // Kategori: Alat Pancing (Rod)
    rod_wood: { name: "Wooden Rod", price: 100000, desc: "+3% hoki ikan & durasi -7d" },
    rod_iron: { name: "Iron Rod", price: 500000, desc: "+8% hoki ikan & durasi -14d" },
    rod_gold: { name: "Golden Rod", price: 2000000, desc: "+15% hoki ikan & durasi -22d" },
    rod_mythic: { name: "Mythic Rod", price: 10000000, desc: "+25% hoki ikan & durasi -30d" },
    
    // Kategori: Pet
    petbox: { name: "Mystery Pet Box", price: 100000, desc: "Gacha 1 Pet Random (Bisa dapat Naga Mythic!)" }
};

// Fungsi helper untuk memformat angka harga agar mudah dibaca (contoh: 1000000 -> 1.000.000)
function formatPrice(num) {
    return num.toLocaleString('id-ID');
}

const { checkActiveEvent } = require('../../utils/eventHelper');

async function handleShop(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    let text = "🛒 *TOKO YUKINOTEMPE* 🛒\n";
    text += "Ketik *!beli [kode_barang] [jumlah]*\nContoh: *!beli potion 2*\n\n";
    
    text += "🎁 *CONSUMABLE*\n";
    const consumables = ['potion', 'buff', 'expbook', 'namecard'];
    for (const key of consumables) {
        const item = shopItems[key];
        text += `🔹 *${item.name}* (Kode: ${key})\n   💰 ${formatPrice(item.price)} G | _${item.desc}_\n`;
    }
    
    text += "\n🎣 *ALAT PANCING (Rod)*\n";
    text += "_*(Otomatis terpakai. Cukup beli 1x!)*_\n";
    const rods = ['rod_wood', 'rod_iron', 'rod_gold', 'rod_mythic'];
    for (const key of rods) {
        const item = shopItems[key];
        text += `🔹 *${item.name}* (Kode: ${key})\n   💰 ${formatPrice(item.price)} G | _${item.desc}_\n`;
    }
    
    text += "\n🐾 *HEWAN PELIHARAAN (PETS)*\n";
    const item = shopItems['petbox'];
    text += `🔹 *${item.name}* (Kode: petbox)\n   💰 ${formatPrice(item.price)} G | _${item.desc}_\n`;
    
    return sock.sendMessage(from, { text: text.trim() }, { quoted: msg });
}

async function handleBuy(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    if (args.length === 0) return sock.sendMessage(from, { text: 'Mau beli apa? Cek barangnya di *!shop* ya 🥺' }, { quoted: msg });

    let quantity = 1;
    const lastArg = args[args.length - 1];

    // Perbaiki deteksi jumlah, pastikan yang dipop adalah angka sungguhan, bukan kata (misal "book" atau kata lain)
    if (lastArg && !isNaN(lastArg)) {
        quantity = parseInt(args.pop());
    }
    
    // Gabung sisa argumen yang bukan angka jadi key (misal "buff scroll" atau "gold coin")
    let rawItemKey = args.join(" ").toLowerCase();
    
    // Map konversi manual untuk kemudahan (soalnya user mungkin ketik "buffscroll" tanpa spasi)
    const keyMap = {
        "buffscroll": "buff",
        "buff scroll": "buff",
        "goldcoin": "gold coin",
        "expbook": "expbook",
        "exp book": "expbook",
        "namecard": "namecard",
        "gantinama": "namecard",
        "kartugantinama": "namecard",
        "kartu ganti nama": "namecard"
    };

    itemKey = keyMap[rawItemKey] || rawItemKey;

    const item = shopItems[itemKey];
    if (!item) return sock.sendMessage(from, { text: 'Barang itu gak ada di toko 🥺 Coba ketik *!shop*' }, { quoted: msg });
    
    if (quantity < 1 || isNaN(quantity)) return sock.sendMessage(from, { text: 'Jumlahnya nggak valid! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    const totalPrice = item.price * quantity;

    if (user.money < totalPrice) {
        return sock.sendMessage(from, { text: `Gold kamu nggak cukup 🥺\nHarga totalnya *${totalPrice} Gold*, tapi kamu cuma punya *${user.money || 0} Gold*.` }, { quoted: msg });
    }

    // Proses pembelian
    user.money -= totalPrice;
    user.inventory[item.name] = (user.inventory[item.name] || 0) + quantity;
    
    saveUsers({ [sender]: user });

    return sock.sendMessage(from, { text: `🎉 Berhasil membeli *${quantity}x ${item.name}* seharga *${totalPrice} Gold*!` }, { quoted: msg });
}

async function handleSell(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    if (args.length === 0) {
        return sock.sendMessage(from, { text: 'Cara pakai:\n- *!jual semua* (jual semua barang)\n- *!jual sampah* (jual sampah dari mancing)\n- *!jual [common/uncommon/rare/epic/legendary/mythic]* (jual ikan berdasar rarity)\n- *!jual panen* (jual semua hasil panen)\n- *!jual [nama_item] [jumlah]*' }, { quoted: msg });
    }

    const user = getUser(sender);
    const activeEvent = checkActiveEvent();
    const multiplier = activeEvent.active ? activeEvent.priceMultiplier : 1;
    
    // Buff Profesi Nelayan (Ekstra 2% Harga per level Job)
    let jobMultiplier = 1;
    if (user.inventory.job === 'nelayan') {
        const jobLv = user.inventory.jobLevel || 1;
        jobMultiplier += (jobLv * 2 / 100);
    }
    
    const sellMode = args[0].toLowerCase();
    
    // List item panen dan harga dari seedData
    const seedList = require('../../data/seedData');
    const harvestItems = seedList.map(s => ({ name: s.harvestItemId, price: s.harvestItemPrice }));
    
    // Fungsi bantuan untuk proses loop dan jual
    const processSell = (filterFn, successTitle, emptyMsg) => {
        let totalGold = 0;
        let soldItemsText = "";
        let isNelayanBonusApplied = false;
        
        // Cek ikan dan hasil panen
        for (const item of [...fishList, ...harvestItems]) {
            const count = user.inventory[item.name] || 0;
            if (count > 0 && filterFn(item)) {
                // Buff Nelayan HANYA berlaku untuk ikan (fishList), BUKAN untuk hasil panen pertanian!
                const isFish = fishList.some(f => f.name.toLowerCase() === item.name.toLowerCase());
                const currentJobMultiplier = isFish ? jobMultiplier : 1;
                if (isFish && jobMultiplier > 1) isNelayanBonusApplied = true;

                // Harga = Harga Dasar * Buff Server * Bonus Profesi Nelayan (jika ikan)
                const finalPrice = Math.floor(item.price * multiplier * currentJobMultiplier);
                totalGold += count * finalPrice;
                soldItemsText += `- ${item.name} x${count}\n`;
                delete user.inventory[item.name];
            }
        }

        if (totalGold === 0) return sock.sendMessage(from, { text: emptyMsg }, { quoted: msg });

        user.money += totalGold;
        saveUsers({ [sender]: user });

        let eventText = activeEvent.active ? `\n(Harga Event Buff x${multiplier})` : "";
        let jobText = isNelayanBonusApplied ? `\n_(👨‍🔧 Buff Profesi Nelayan Aktif pada Ikan!)_` : "";
        
        return sock.sendMessage(from, { text: `💰 *BERHASIL MENJUAL ${successTitle.toUpperCase()}* 💰\n\nKamu menjual:\n${soldItemsText}\nTotal Pendapatan: *+${totalGold} Gold*${eventText}${jobText}` }, { quoted: msg });
    };

    if (sellMode === "semua") {
        return processSell(() => true, "SEMUA BARANG", "Kamu nggak punya ikan/barang panen yang bisa dijual 🥺");
    } else if (sellMode === "sampah" || sellMode === "trash") {
        return processSell((i) => i.rarity === "trash", "SAMPAH", "Kamu nggak punya sampah buat dijual 🥺");
    } else if (['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'].includes(sellMode)) {
        return processSell((i) => i.rarity === sellMode, `IKAN ${sellMode}`, `Kamu nggak punya ikan dengan rarity ${sellMode} 🥺`);
    } else if (sellMode === "panen" || sellMode === "hasilpanen") {
        return processSell((i) => harvestItems.some(h => h.name === i.name), "HASIL PANEN", "Kamu nggak punya hasil panen buat dijual 🥺");
    }
    
    // Jual spesifik
    const qtyInput = args[args.length - 1];
    const qty = parseInt(qtyInput);
    const amount = isNaN(qty) ? 1 : qty;
    const nameRaw = isNaN(qty) ? args.join(" ") : args.slice(0, -1).join(" ");
    
    // Cari di fish list dan harvest list
    const itemData = [...fishList, ...harvestItems].find((i) => i.name.toLowerCase() === nameRaw.toLowerCase());
    
    if (!itemData) return sock.sendMessage(from, { text: 'Item itu tidak bisa dijual ke pengepul 🥺' }, { quoted: msg });
    
    const owned = user.inventory[itemData.name] || 0;
    if (owned < amount) return sock.sendMessage(from, { text: `Kamu cuma punya *${owned}* ${itemData.name} 🥺` }, { quoted: msg });
    
    // Buff Nelayan HANYA untuk ikan
    const isFish = fishList.some(f => f.name.toLowerCase() === itemData.name.toLowerCase());
    const effectiveJobMultiplier = isFish ? jobMultiplier : 1;

    const finalPrice = Math.floor(itemData.price * multiplier * effectiveJobMultiplier);
    const earned = amount * finalPrice;
    user.inventory[itemData.name] -= amount;
    if (user.inventory[itemData.name] <= 0) delete user.inventory[itemData.name];
    user.money += earned;
    
    saveUsers({ [sender]: user });
    
    let eventText = activeEvent.active ? ` (Event x${multiplier})` : "";
    let jobText = (isFish && user.inventory.job === 'nelayan') ? ` _(👨‍🔧 Bonus Nelayan Aktif)_` : "";
    return sock.sendMessage(from, { text: `💰 Kamu menjual *${amount}x ${itemData.name}* dan mendapatkan *${earned} Gold*${eventText}.${jobText}` }, { quoted: msg });
}

module.exports = {
    handleShop,
    handleBuy,
    handleSell
};
