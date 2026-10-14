async function handleMenu(sock, msg, from, sender, pushName) {
    const menuText = `🌟 *YUKINOTEMPE V2 MENU* 🌟
Halo *${pushName}*! 💜

🎮 *RPG & Core*
• !regist
• !profil
• !lb
• !inv
• !daily
• !mancing
• !petualang
• !lawan
• !shop
• !beli
• !jual
• !tf
• !bank 
• !ladang
• !tanam
• !panen
• !zoo (atau !pet)
• !index (Index Ikan)
• !indexpet (Index Pet)
• !gacha
• !afk
• !pakai
• !listikan

🎰 *Mini-Games*
• !ttt
• !cf
• !slot

📚 *Fun & Tools*
• !tanya
• !tebakkata
• !sticker
• !brat
• !gif [kata kunci]
• !tiktok
• !ping 

🛠️ *Admin*
• !addgold
• !ban
• !event [mulai/stop/status]
• !listuser

_Bingung cara pakainya? Ketik *!tanya [pertanyaanmu]* biar Yuki jelasin! 💜_`;

    return sock.sendMessage(from, { text: menuText }, { quoted: msg });
}

module.exports = {
    handleMenu
};