const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const { addExp } = require('../../utils/levelingHelper');
const petList = require('../../data/petData');
const { getPetIndexLuck, syncPetIndex } = require('./petIndexHandler');

const itemMap = {
    potion: "Potion",
    "buff scroll": "Buff Scroll",
    "exp book": "Exp Book",
    "gold coin": "Gold Coin",
    "petbox": "Mystery Pet Box",
    "namecard": "Kartu Ganti Nama",
    "kartu ganti nama": "Kartu Ganti Nama",
    "ganti nama": "Kartu Ganti Nama"
};

async function handleUseItem(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    if (args.length === 0) return sock.sendMessage(from, { text: 'Gunakan: *!pakai [nama_item] [jumlah/argumen]*\nContoh:\n- *!pakai potion 2*\n- *!pakai namecard [NamaBaru]*' }, { quoted: msg });

    const user = getUser(sender);
    
    // Khusus penanganan Kartu Ganti Nama (format: !pakai namecard [NamaBaru])
    const firstArgLower = (args[0] || '').toLowerCase();
    if (firstArgLower === 'namecard' || firstArgLower === 'gantinama' || (args.length >= 2 && `${args[0]} ${args[1]}`.toLowerCase() === 'ganti nama')) {
        const ownedCard = user.inventory["Kartu Ganti Nama"] || 0;
        if (ownedCard < 1) {
            return sock.sendMessage(from, { text: `Kamu tidak punya *Kartu Ganti Nama*! 🥺\nBeli dulu di toko dengan *!beli namecard* seharga 100.000 Gold.` }, { quoted: msg });
        }

        // Ambil nama baru setelah kata kunci namecard
        let newName = "";
        if (`${args[0]} ${args[1]}`.toLowerCase() === 'ganti nama') {
            newName = args.slice(2).join(" ").trim();
        } else {
            newName = args.slice(1).join(" ").trim();
        }

        if (!newName) {
            return sock.sendMessage(from, { text: `Tulis nama baru yang kamu inginkan! 🥺\nContoh: *!pakai namecard Kirito*` }, { quoted: msg });
        }

        if (newName.length < 3 || newName.length > 25) {
            return sock.sendMessage(from, { text: `Nama harus antara 3 sampai 25 karakter ya! 🥺` }, { quoted: msg });
        }

        const oldName = user.name;
        user.name = newName;
        user.inventory["Kartu Ganti Nama"] -= 1;
        if (user.inventory["Kartu Ganti Nama"] <= 0) delete user.inventory["Kartu Ganti Nama"];

        saveUsers({ [sender]: user });
        return sock.sendMessage(from, { text: `✨ *BERHASIL GANTI NAMA!* ✨\n\nNama petualang kamu berhasil diubah dari *${oldName}* menjadi *${newName}*! 🏷️🎉\n1x Kartu Ganti Nama telah digunakan.\n\nCek profilmu sekarang dengan *!profil*` }, { quoted: msg });
    }

    // Fallback inisialisasi stamina kalau belum ada di database lama
    if (user.stamina === undefined) user.stamina = user.maxStamina || 10;

    let quantity = 1;
    const lastArg = args[args.length - 1];
    
    if (!isNaN(parseInt(lastArg))) {
        quantity = parseInt(args.pop());
    }

    const itemKey = args.join(" ").toLowerCase();
    const itemName = itemMap[itemKey];

    if (!itemName) return sock.sendMessage(from, { text: 'Item itu tidak bisa dipakai atau tidak ada 🥺' }, { quoted: msg });

    const owned = user.inventory[itemName] || 0;
    if (owned < quantity) return sock.sendMessage(from, { text: `Kamu nggak punya cukup item 🥺 (Punya: ${owned})` }, { quoted: msg });

    // Terapkan efek item
    let replyText = "";
    if (itemName === "Potion") {
        const maxStamina = user.maxStamina || 10;
        
        if (user.stamina >= maxStamina) {
             return sock.sendMessage(from, { text: `Staminamu sudah penuh (Max: ${maxStamina})! 🥺 Sayang potionnya.` }, { quoted: msg });
        }
        
        const staminaGain = 3 * quantity;
        user.stamina += staminaGain;
        if (user.stamina > maxStamina) user.stamina = maxStamina;
        
        replyText = `🧪 *Glupp.. Glupp..*\nKamu meminum ${quantity}x Potion dan mendapatkan *+${staminaGain} Stamina*!\n(Stamina: *${user.stamina}/${maxStamina}*).`;
    } else if (itemName === "Exp Book") {
        const expGain = 50 * quantity;
        const levelUpMsg = addExp(sender, expGain); 
        
        // Penting: Sinkronkan kembali user instance di sini karena addExp 
        // sudah memodifikasi database melalui getUsers + saveUsers lama.
        // Jika tidak, saveUsers({ [sender]: user }) di bawah akan menimpa 
        // kembali EXP dan Level dari variabel `user` yang lama.
        const updatedUser = getUser(sender);
        user.exp = updatedUser.exp;
        user.level = updatedUser.level;
        user.money = updatedUser.money; 

        replyText = `📘 Kamu membaca ${quantity}x Exp Book dan mendapatkan *+${expGain} EXP*!`;
        if (levelUpMsg) replyText += `\n🎉 Selamat! Kamu naik ke *Level ${levelUpMsg}*! 🥳`;
    } else if (itemName === "Buff Scroll") {
        if (!user.inventory.buffCharges) {
            user.inventory.buffCharges = 0;
        }
        user.inventory.buffCharges += quantity;
        user.inventory.buffActive = true;
        replyText = `📜 *WUSHH!*\nKamu menggunakan ${quantity}x Buff Scroll!\nSekarang kamu punya efek *+25% Peluang Menang* untuk *${user.inventory.buffCharges}x pertarungan \`!lawan\`* berikutnya!`;
    } else if (itemName === "Gold Coin") {
        const goldGain = 125 * quantity;
        user.money += goldGain;
        replyText = `🪙 *CLING!*\nKamu mencairkan ${quantity}x Gold Coin dan mendapatkan *+${goldGain} Gold*!`;
    } else if (itemName === "Mystery Pet Box") {
        let boxReplyText = `📦 *MEMBUKA ${quantity}x MYSTERY PET BOX* 📦\n\n`;
        let totalExpBonus = 0;
        
        if (!user.inventory.pets) user.inventory.pets = [];
        
        // Ambil bonus luck dari Pet Index (hingga +20%)
        const currentUnlockedPets = syncPetIndex(user);
        const petIndexLuck = getPetIndexLuck(currentUnlockedPets.length, petList.length);
        const luckPercentText = (petIndexLuck * 100).toFixed(0);

        let newPetIndexNotif = [];

        for (let i = 0; i < quantity; i++) {
            const rand = Math.random();
            let selectedRarity = "common";
            
            // Rate Pet Box - Dasar + Pengali Luck dari Index Pet (Hingga +20% / 1.20x multiplier)
            const luckMultiplier = 1 + petIndexLuck;
            const mythicThreshold = 0.0001 * luckMultiplier;
            const legendaryThreshold = mythicThreshold + (0.003 * luckMultiplier);
            const epicThreshold = legendaryThreshold + (0.027 * luckMultiplier);
            const rareThreshold = epicThreshold + (0.22 * luckMultiplier);

            if (rand < mythicThreshold) selectedRarity = "mythic";
            else if (rand < legendaryThreshold) selectedRarity = "legendary";
            else if (rand < epicThreshold) selectedRarity = "epic";
            else if (rand < rareThreshold) selectedRarity = "rare";
            else selectedRarity = "common";
            
            const candidates = petList.filter(p => p.rarity === selectedRarity);
            const pet = candidates[Math.floor(Math.random() * candidates.length)];
            
            // Cek apakah pet baru untuk index
            if (!user.inventory.petIndex) user.inventory.petIndex = [];
            const isNewInIndex = !user.inventory.petIndex.some(id => id.toLowerCase() === pet.id.toLowerCase());
            if (isNewInIndex) {
                user.inventory.petIndex.push(pet.id);
                newPetIndexNotif.push(`✨ *NEW ENTRY:* ${pet.name} masuk ke !indexpet!`);
            }

            boxReplyText += `✨ Mendapatkan: *${pet.name}* (${pet.rarity.toUpperCase()})!\n`;
            
            // Masukkan ke inventory pets jika belum punya
            if (!user.inventory.pets.includes(pet.id)) {
                user.inventory.pets.push(pet.id);
            } else {
                // Jika duplikat, konversi jadi EXP
                const dupExp = 100;
                totalExpBonus += dupExp;
                boxReplyText += `   _(Duplikat dikonversi jadi +${dupExp} EXP)_\n`;
            }
        }
        
        if (petIndexLuck > 0) {
            boxReplyText += `\n🍀 _Bonus Index Pet Aktif: +${luckPercentText}% Luck Box_\n`;
        }
        if (newPetIndexNotif.length > 0) {
            boxReplyText += `\n` + newPetIndexNotif.join('\n') + `\n`;
        }
        
        if (totalExpBonus > 0) {
            const levelUpMsg = addExp(sender, totalExpBonus);
            const updatedUser = getUser(sender);
            user.exp = updatedUser.exp;
            user.level = updatedUser.level;
            user.money = updatedUser.money;
            boxReplyText += `\nKamu juga mendapatkan *+${totalExpBonus} EXP* dari peliharaan yang sama!`;
            if (levelUpMsg) boxReplyText += `\n🎉 Naik ke Level *${levelUpMsg}*!`;
        }
        
        // Auto set aktif jika belum ada pet yang aktif
        if (!user.inventory.activePet && user.inventory.pets.length > 0) {
            user.inventory.activePet = user.inventory.pets[user.inventory.pets.length - 1];
            const activeData = petList.find(p => p.id === user.inventory.activePet);
            boxReplyText += `\n\n🐾 Pet *${activeData.name}* otomatis dipasang!`;
        } else {
            boxReplyText += `\n\n_(Ketik !pet pakai [nama_pet] untuk memakai peliharaanmu)_`;
        }
        
        replyText = boxReplyText;
    }

    // Kurangi item
    user.inventory[itemName] -= quantity;
    if (user.inventory[itemName] <= 0) delete user.inventory[itemName];
    user.inventory.stamina = user.stamina;

    saveUsers({ [sender]: user });
    return sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

module.exports = {
    handleUseItem
};
