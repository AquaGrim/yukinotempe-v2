const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');
const petList = require('../../data/petData');

async function handlePet(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) return sock.sendMessage(from, { text: 'Kamu belum terdaftar! 🥺' }, { quoted: msg });

    const user = getUser(sender);
    const ownedPets = user.inventory.pets || [];
    
    if (args.length === 0) {
        if (ownedPets.length === 0) {
            return sock.sendMessage(from, { text: '🐾 Kamu belum memiliki peliharaan sama sekali!\n_Beli Pet Box di !shop untuk mendapatkan peliharaan random!_' }, { quoted: msg });
        }
        
        let text = "🦁 *KEBUN BINATANG & KANDANG PET* 🐾\n\n";
        
        const activePetId = user.inventory.activePet;
        
        for (const petId of ownedPets) {
            const petData = petList.find(p => p.id === petId);
            if (!petData) continue;
            
            const isEquipped = (petId === activePetId) ? "✨ *(Sedang Dipakai)*" : "";
            text += `🔹 *${petData.name}* \`[${petData.rarity.toUpperCase()}]\` ${isEquipped}\n   _${petData.effectText}_\n`;
        }
        
        text += "\n💡 *Cara Pasang:* `!pet pakai [nama_pet]`\n_Contoh: !pet pakai slime_";
        
        return sock.sendMessage(from, { text: text }, { quoted: msg });
    }

    const command = args[0].toLowerCase();
    
    if (command === "pakai") {
        const petQuery = args.slice(1).join(" ").toLowerCase();
        
        if (!petQuery) return sock.sendMessage(from, { text: 'Pilih pet yang mau dipakai!\nContoh: *!pet pakai slime*' }, { quoted: msg });
        
        const targetPet = petList.find(p => p.name.toLowerCase().includes(petQuery) || p.id.toLowerCase().includes(petQuery));
        
        if (!targetPet) return sock.sendMessage(from, { text: 'Pet itu tidak ditemukan dalam game! 🥺' }, { quoted: msg });
        if (!ownedPets.includes(targetPet.id)) return sock.sendMessage(from, { text: `Kamu tidak memiliki *${targetPet.name}*! Beli Pet Box dulu gih! 🥺` }, { quoted: msg });
        
        user.inventory.activePet = targetPet.id;
        saveUsers({ [sender]: user });
        
        return sock.sendMessage(from, { text: `🐾 Berhasil memasang *${targetPet.name}* sebagai peliharaan aktif!\n\n_Buff Aktif:_ ${targetPet.effectText}` }, { quoted: msg });
    }
}

module.exports = {
    handlePet
};