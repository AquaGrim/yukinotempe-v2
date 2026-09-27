const { getUsers, saveUsers } = require('./databaseHelper');

// Menambah EXP user dan mengecek apakah naik level
function addExp(sender, amount) {
    const users = getUsers();
    if (!users[sender]) return false;

    users[sender].exp += amount;
    
    let levelUp = false;
    let currentLevel = users[sender].level;
    
    // Rumus simple: butuh (Level * 100) EXP untuk naik ke level berikutnya
    while (users[sender].exp >= currentLevel * 100) {
        users[sender].exp -= currentLevel * 100;
        currentLevel += 1;
        levelUp = true;
    }

    if (levelUp) {
        users[sender].level = currentLevel;
        // Kasih bonus uang tiap naik level
        users[sender].money += currentLevel * 50; 
    }

    saveUsers(users);
    return levelUp ? currentLevel : false;
}

module.exports = { addExp };