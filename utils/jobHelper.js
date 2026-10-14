const { getUser, saveUsers } = require('./databaseHelper');

const jobConfig = {
    petani: {
        name: 'Petani 🌾',
        desc: 'Spesialis bertani. Mendapatkan Job EXP tiap memanen. Pasif: Nambah ekstra panen sesuai level job.',
    },
    nelayan: {
        name: 'Nelayan 🎣',
        desc: 'Spesialis memancing. Mendapatkan Job EXP tiap memancing. Pasif: Bonus Gold ekstra saat jual ikan sesuai level job.',
    },
    ksatria: {
        name: 'Ksatria ⚔️',
        desc: 'Spesialis bertarung. Mendapatkan Job EXP dari !lawan. Pasif: Nambah Win Rate dan bonus EXP karakter.',
    }
};

// Skala kebutuhan EXP yang sangat eksponensial (biar susah naik)
function getJobExpRequired(level) {
    // Lv1->2 = 200, Lv2->3 = 300, Lv3->4 = 450, dsb (dikali 1.5 tiap level, hard grinding)
    return Math.floor(200 * Math.pow(1.5, level - 1));
}

function addJobExp(sender, jobType, expAmount) {
    const user = getUser(sender);
    
    // Kalau job user gak sama dengan aktifitasnya, abaikan
    if (!user.inventory.job || user.inventory.job !== jobType) return false;
    
    if (!user.inventory.jobLevel) user.inventory.jobLevel = 1;
    if (!user.inventory.jobExp) user.inventory.jobExp = 0;
    
    user.inventory.jobExp += expAmount;
    let levelUp = false;
    let oldLevel = user.inventory.jobLevel;
    
    while (user.inventory.jobExp >= getJobExpRequired(user.inventory.jobLevel)) {
        user.inventory.jobExp -= getJobExpRequired(user.inventory.jobLevel);
        user.inventory.jobLevel += 1;
        levelUp = true;
    }
    
    saveUsers({ [sender]: user });
    
    if (levelUp) {
        return { leveledUp: true, newLevel: user.inventory.jobLevel };
    }
    return { leveledUp: false };
}

module.exports = { jobConfig, getJobExpRequired, addJobExp };
