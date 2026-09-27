const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const fishList = require('../../data/fishData');

const shopItems = {
    // Kategori: Consumable
    potion: { name: "Potion", price: 1000, desc: "+3 Stamina" },
    buff: { name: "Buff Scroll", price: 75, desc: "+25% peluang menang battle" },
    expbook: { name: "Exp Book", price: 150, desc: "+50 EXP" },
    
    // Kategori: Alat Pancing (Rod)
    rod_wood: { name: "Wooden Rod", price: 100000, desc: "+5% hoki ikan & durasi -10d" },
    rod_iron: { name: "Iron Rod", price: 500000, desc: "+15% hoki ikan & durasi -20d" },
    rod_gold: { name: "Golden Rod", price: 2000000, desc: "+35% hoki ikan & durasi -30d" },
    rod_mythic: { name: "Mythic Rod", price: 10000000, desc: "+70% hoki ikan & durasi -40d" }
};

// Fungsi helper untuk memformat angka harga agar mudah dibaca (contoh: 1000000 -> 1.000.000)
function formatPrice(num) {
    return num.toLocaleString('id-ID');
}

async function handleShop(sock, msg, from, sender) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    let text = "🛒 *TOKO YUKINOTEMPE* 🛒\n";
    text += "Ketik *!beli [kode_barang] [jumlah]*\nContoh: *!beli potion 2*\n\n";
    
    text += "🎁 *CONSUMABLE*\n";
    const consumables = ['potion', 'buff', 'expbook'];
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
    
    return sock.sendMessage(from, { text: text.trim() }, { quoted: msg });
}

async function handleBuy(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    if (args.length === 0) return sock.sendMessage(from, { text: 'Mau beli apa? Cek barangnya di *!shop* ya 🥺' }, { quoted: msg });

    const itemKey = args[0].toLowerCase();
    const quantity = parseInt(args[1]) || 1;

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
        return sock.sendMessage(from, { text: 'Cara pakai:\n- *!jual semua* (jual semua ikan/barang rongsok)\n- *!jual nama_item jumlah*' }, { quoted: msg });
    }

    const user = getUser(sender);
    
    if (args[0].toLowerCase() === "semua") {
        let totalGold = 0;
        let soldItemsText = "";
        
        // Loop melalui data ikan saja untuk dijual (item penting tidak ikut terjual)
        for (const fish of fishList) {
            const count = user.inventory[fish.name] || 0;
            if (count > 0) {
                totalGold += count * fish.price;
                soldItemsText += `- ${fish.name} x${count}\n`;
                delete user.inventory[fish.name];
            }
        }

        if (totalGold === 0) return sock.sendMessage(from, { text: 'Kamu nggak punya ikan/barang yang bisa dijual 🥺' }, { quoted: msg });

        user.money += totalGold;
        saveUsers({ [sender]: user });

        return sock.sendMessage(from, { text: `💰 *BERHASIL MENJUAL SEMUA* 💰\n\nKamu menjual:\n${soldItemsText}\nTotal Pendapatan: *+${totalGold} Gold*` }, { quoted: msg });
    }
    
    // Jual spesifik
    const qtyInput = args[args.length - 1];
    const qty = parseInt(qtyInput);
    const amount = isNaN(qty) ? 1 : qty;
    const nameRaw = isNaN(qty) ? args.join(" ") : args.slice(0, -1).join(" ");
    
    const itemData = fishList.find((i) => i.name.toLowerCase() === nameRaw.toLowerCase());
    
    if (!itemData) return sock.sendMessage(from, { text: 'Item itu tidak bisa dijual ke pengepul ikan 🥺' }, { quoted: msg });
    
    const owned = user.inventory[itemData.name] || 0;
    if (owned < amount) return sock.sendMessage(from, { text: `Kamu cuma punya *${owned}* ${itemData.name} 🥺` }, { quoted: msg });
    
    const earned = amount * itemData.price;
    user.inventory[itemData.name] -= amount;
    if (user.inventory[itemData.name] <= 0) delete user.inventory[itemData.name];
    user.money += earned;
    
    saveUsers({ [sender]: user });
    return sock.sendMessage(from, { text: `💰 Kamu menjual *${amount}x ${itemData.name}* dan mendapatkan *${earned} Gold*.` }, { quoted: msg });
}

module.exports = {
    handleShop,
    handleBuy,
    handleSell
};
