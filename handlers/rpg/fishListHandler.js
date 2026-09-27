const fishList = require('../../data/fishData');

async function handleFishList(sock, msg, from, sender) {
    // Mengelompokkan ikan berdasarkan rarity
    const groupedFishes = {
        trash: [],
        common: [],
        uncommon: [],
        rare: [],
        epic: [],
        legendary: [],
        mythic: []
    };

    fishList.forEach(fish => {
        if (groupedFishes[fish.rarity]) {
            groupedFishes[fish.rarity].push(`- ${fish.name} (💰 ${fish.price})`);
        }
    });

    let replyText = `🌊 *ENSIKLOPEDIA IKAN* 🌊\n\n`;
    
    replyText += `🪨 *TRASH (Sampah)*\n${groupedFishes.trash.join('\n')}\n\n`;
    replyText += `🐟 *COMMON (Biasa)*\n${groupedFishes.common.join('\n')}\n\n`;
    replyText += `🐡 *UNCOMMON (Lumayan)*\n${groupedFishes.uncommon.join('\n')}\n\n`;
    replyText += `🦐 *RARE (Langka)*\n${groupedFishes.rare.join('\n')}\n\n`;
    replyText += `🦞 *EPIC (Sangat Langka)*\n${groupedFishes.epic.join('\n')}\n\n`;
    replyText += `🦈 *LEGENDARY (Legendaris)*\n${groupedFishes.legendary.join('\n')}\n\n`;
    replyText += `🐉 *MYTHIC (Mitos)*\n${groupedFishes.mythic.join('\n')}`;

    return sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

module.exports = {
    handleFishList
};
