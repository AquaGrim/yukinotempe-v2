const { getUser, saveUsers, isUserRegistered } = require('../../utils/databaseHelper');

// Store active games in memory
// Key: chat/room ID (bisa jid grup atau sender di pm), value: game state
const tttGames = {};

async function handleTicTacToe(sock, msg, from, sender, args) {
    if (!isUserRegistered(sender)) {
        return sock.sendMessage(from, { text: 'Kamu belum terdaftar! Silakan ketik *!regist Nama | Umur* dulu ya 🥺' }, { quoted: msg });
    }

    if (args.length === 0) {
        return sock.sendMessage(from, { text: '🎮 *CARA MAIN TIC-TAC-TOE* 🎮\n\n- *!ttt @user [taruhan]* : Nantang player lain\n- *!ttt terima* : Menerima tantangan\n- *!ttt tolak* : Menolak tantangan\n- *!ttt [1-9]* : Mengisi kotak saat giliranmu\n- *!ttt nyerah* : Menyerah dari game' }, { quoted: msg });
    }

    const command = args[0].toLowerCase();
    
    // Check if there is a game in this chat
    let game = tttGames[from];

    if (command === 'nyerah' || command === 'surrender') {
        if (!game) return sock.sendMessage(from, { text: 'Nggak ada game yang lagi jalan di sini 🥺' }, { quoted: msg });
        if (game.playerX !== sender && game.playerO !== sender) return sock.sendMessage(from, { text: 'Kamu kan nggak ikut main! 😠' }, { quoted: msg });
        
        const winner = game.playerX === sender ? game.playerO : game.playerX;
        
        // Selesaikan game
        finishGame(sock, from, winner, sender, game, 'surrender', msg);
        return;
    }

    if (command === 'terima' || command === 'accept') {
        if (!game) return sock.sendMessage(from, { text: 'Tidak ada tantangan yang masuk! 🥺' }, { quoted: msg });
        if (game.status !== 'waiting') return sock.sendMessage(from, { text: 'Game sudah berjalan! 🥺' }, { quoted: msg });
        if (game.playerO !== sender) return sock.sendMessage(from, { text: 'Tantangan ini bukan buat kamu! 😠' }, { quoted: msg });

        // Cek uang
        const userX = getUser(game.playerX);
        const userO = getUser(game.playerO);
        
        if (userX.money < game.bet) {
            delete tttGames[from];
            return sock.sendMessage(from, { text: `Game dibatalkan karena pembuat tantangan tidak punya cukup uang (Butuh ${game.bet} Gold)! 🥺` }, { quoted: msg });
        }
        if (userO.money < game.bet) {
            delete tttGames[from];
            return sock.sendMessage(from, { text: `Game dibatalkan karena kamu tidak punya cukup uang (Butuh ${game.bet} Gold)! 🥺` }, { quoted: msg });
        }

        game.status = 'playing';
        return sock.sendMessage(from, { text: `🎮 Tantangan Tic-Tac-Toe diterima!\nTaruhan: 💰 *${game.bet} Gold*\n\nGiliran @${game.playerX.split('@')[0]} (❌)\n\n${renderBoard(game.board)}`, mentions: [game.playerX] }, { quoted: msg });
    }

    if (command === 'tolak' || command === 'reject') {
        if (!game) return sock.sendMessage(from, { text: 'Tidak ada tantangan yang masuk! 🥺' }, { quoted: msg });
        if (game.status !== 'waiting') return sock.sendMessage(from, { text: 'Game sudah berjalan! 🥺' }, { quoted: msg });
        if (game.playerO !== sender) return sock.sendMessage(from, { text: 'Tantangan ini bukan buat kamu! 😠' }, { quoted: msg });

        delete tttGames[from];
        return sock.sendMessage(from, { text: 'Tantangan Tic-Tac-Toe ditolak! 🥺' }, { quoted: msg });
    }
    
    // Kalau angka 1-9
    if (/^[1-9]$/.test(command)) {
        if (!game) return sock.sendMessage(from, { text: 'Nggak ada game yang lagi jalan di sini 🥺' }, { quoted: msg });
        if (game.status !== 'playing') return sock.sendMessage(from, { text: 'Game belum dimulai atau sedang menunggu pemain! 🥺' }, { quoted: msg });
        
        const isPlayerX = game.playerX === sender;
        const isPlayerO = game.playerO === sender;
        
        if (!isPlayerX && !isPlayerO) return sock.sendMessage(from, { text: 'Kamu nggak ikut main, jangan ikut campur! 😠' }, { quoted: msg });
        if ((game.turn === 'X' && !isPlayerX) || (game.turn === 'O' && !isPlayerO)) return sock.sendMessage(from, { text: 'Bukan giliranmu! Sabar ya 🥺' }, { quoted: msg });
        
        const pos = parseInt(command) - 1;
        if (game.board[pos] === '❌' || game.board[pos] === '⭕') {
            return sock.sendMessage(from, { text: 'Kotak itu sudah terisi! Pilih angka lain 🥺' }, { quoted: msg });
        }
        
        game.board[pos] = game.turn === 'X' ? '❌' : '⭕';
        game.turn = game.turn === 'X' ? 'O' : 'X';
        
        // Cek win/draw
        const win = checkWin(game.board);
        if (win) {
            const winner = win === '❌' ? game.playerX : game.playerO;
            const loser = win === '❌' ? game.playerO : game.playerX;
            finishGame(sock, from, winner, loser, game, 'win', msg);
            return;
        }
        
        if (game.board.every(cell => cell === '❌' || cell === '⭕')) {
            finishGame(sock, from, null, null, game, 'draw', msg);
            return;
        }
        
        const nextPlayer = game.turn === 'X' ? game.playerX : game.playerO;
        return sock.sendMessage(from, { text: `Giliran @${nextPlayer.split('@')[0]} (${game.turn === 'X' ? '❌' : '⭕'})\n\n${renderBoard(game.board)}`, mentions: [nextPlayer] }, { quoted: msg });
    }

    // Tantang (Buat game baru)
    if (!game) {
        let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) target = quoted;
        }
        if (!target) return sock.sendMessage(from, { text: 'Tag (@) atau reply orang yang mau ditantang main Tic-Tac-Toe! 🥺\nContoh: *!ttt @orang 500*' }, { quoted: msg });
        
        if (target === sender) return sock.sendMessage(from, { text: 'Nggak bisa nantang diri sendiri dong! 🥺' }, { quoted: msg });
        
        let bet = 0;
        if (args.length > 1) {
            bet = parseInt(args[1].replace(/[^0-9]/g, ''));
            if (isNaN(bet)) bet = 0;
        }
        
        if (!isUserRegistered(target)) {
            return sock.sendMessage(from, { text: 'Lawanmu belum terdaftar di bot ini! 🥺' }, { quoted: msg });
        }
        
        const userSender = getUser(sender);
        if (userSender.money < bet) {
            return sock.sendMessage(from, { text: `Uangmu tidak cukup untuk taruhan 💰 ${bet} Gold! 🥺` }, { quoted: msg });
        }
        
        const targetUser = getUser(target);
        if (targetUser.money < bet) {
            return sock.sendMessage(from, { text: `Uang lawanmu tidak cukup untuk taruhan 💰 ${bet} Gold! 🥺` }, { quoted: msg });
        }
        
        tttGames[from] = {
            playerX: sender,
            playerO: target,
            board: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'],
            turn: 'X',
            status: 'waiting',
            bet: bet
        };
        
        return sock.sendMessage(from, { text: `🎮 *TANTANGAN TIC-TAC-TOE* 🎮\n\n@${sender.split('@')[0]} menantang @${target.split('@')[0]}!\nTaruhan: 💰 *${bet} Gold*\n\nKetik *!ttt terima* untuk main atau *!ttt tolak* untuk membatalkan.`, mentions: [sender, target] }, { quoted: msg });
    } else {
        return sock.sendMessage(from, { text: 'Masih ada game yang belum selesai di chat ini! Selesaikan dulu atau ketik *!ttt nyerah* 🥺' }, { quoted: msg });
    }
}

function renderBoard(board) {
    return `${board[0]}${board[1]}${board[2]}\n${board[3]}${board[4]}${board[5]}\n${board[6]}${board[7]}${board[8]}`;
}

function checkWin(b) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let w of wins) {
        if (b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]] && (b[w[0]] === '❌' || b[w[0]] === '⭕')) {
            return b[w[0]];
        }
    }
    return null;
}

function finishGame(sock, from, winner, loser, game, reason, msg) {
    let text = "";
    if (reason === 'draw') {
        text = `🎮 *TIC-TAC-TOE SERI!* 🎮\n\nTidak ada yang menang dan tidak ada yang kalah.\nTaruhan 💰 ${game.bet} Gold tidak ada yang hilang.\n\n${renderBoard(game.board)}`;
    } else if (reason === 'surrender') {
        const winUser = getUser(winner);
        const loseUser = getUser(loser);
        winUser.money += game.bet;
        loseUser.money -= game.bet;
        saveUsers({ [winner]: winUser, [loser]: loseUser });
        text = `🏳️ *MENYERAH* 🏳️\n\n@${loser.split('@')[0]} menyerah ketakutan!\n@${winner.split('@')[0]} memenangkan 💰 *${game.bet} Gold*!\n\n${renderBoard(game.board)}`;
    } else {
        const winUser = getUser(winner);
        const loseUser = getUser(loser);
        winUser.money += game.bet;
        loseUser.money -= game.bet;
        saveUsers({ [winner]: winUser, [loser]: loseUser });
        text = `🎉 *PEMENANG TIC-TAC-TOE!* 🎉\n\nSelamat @${winner.split('@')[0]}!\nKamu mengalahkan @${loser.split('@')[0]} dan memenangkan 💰 *${game.bet} Gold*!\n\n${renderBoard(game.board)}`;
    }
    
    delete tttGames[from];
    
    const mentions = winner && loser ? [winner, loser] : [];
    sock.sendMessage(from, { text: text, mentions: mentions }, { quoted: msg });
}

module.exports = { handleTicTacToe };