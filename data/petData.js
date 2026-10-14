module.exports = [
    // === COMMON (Stat Dasar Tunggal) ===
    {
        id: "slime",
        name: "Slime Hijau",
        rarity: "common",
        effectText: "+5% EXP dari segala aktivitas",
        bonus: { exp: 0.05, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "kelinci",
        name: "Kelinci Putih",
        rarity: "common",
        effectText: "Pangkas -5 detik durasi mancing",
        bonus: { exp: 0, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 5 }
    },
    {
        id: "cacing",
        name: "Cacing Tanah",
        rarity: "common",
        effectText: "+3% Peluang Hoki Mancing",
        bonus: { exp: 0, gold: 0, fishingLuck: 0.03, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "kumbang",
        name: "Kumbang Daun",
        rarity: "common",
        effectText: "+5% Hasil Panen Ladang & -5% Waktu Tanam",
        bonus: { exp: 0, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0.05, farmTimeReduction: 0.05, fishTimeReduction: 0 }
    },
    {
        id: "tikus_tanah",
        name: "Tikus Tanah Ceria",
        rarity: "common",
        effectText: "-10% Waktu Tanam Ladang",
        bonus: { exp: 0, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0, farmTimeReduction: 0.10, fishTimeReduction: 0 }
    },

    // === RARE (Stat Lebih Bagus / Kombinasi Ringan) ===
    {
        id: "kucing",
        name: "Kucing Oren",
        rarity: "rare",
        effectText: "+10% Pendapatan Gold (Jual Ikan & Adventure)",
        bonus: { exp: 0, gold: 0.10, fishingLuck: 0, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "shiba",
        name: "Anjing Shiba",
        rarity: "rare",
        effectText: "+10% EXP aktivitas",
        bonus: { exp: 0.10, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "bebek",
        name: "Bebek Nelayan",
        rarity: "rare",
        effectText: "+6% Hoki Mancing & Pangkas -5 detik mancing",
        bonus: { exp: 0, gold: 0, fishingLuck: 0.06, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 5 }
    },
    {
        id: "rubah",
        name: "Rubah Hutan",
        rarity: "rare",
        effectText: "+10% Hoki Temuan Petualang (Adventure)",
        bonus: { exp: 0, gold: 0, fishingLuck: 0, adventureLuck: 0.10, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "tupai",
        name: "Tupai Kebun",
        rarity: "rare",
        effectText: "+12% Panen Ladang, -15% Waktu Tanam & +5% EXP",
        bonus: { exp: 0.05, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0.12, farmTimeReduction: 0.15, fishTimeReduction: 0 }
    },

    // === EPIC (Multi-Stat Kuat) ===
    {
        id: "burung",
        name: "Burung Hantu Bijak",
        rarity: "epic",
        effectText: "+10% Hoki Mancing, +15% Hoki Adventure & +10% EXP",
        bonus: { exp: 0.10, gold: 0, fishingLuck: 0.10, adventureLuck: 0.15, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "penguin",
        name: "Penguin Salju",
        rarity: "epic",
        effectText: "+12% Hoki Mancing & Pangkas -12 detik mancing",
        bonus: { exp: 0, gold: 0, fishingLuck: 0.12, adventureLuck: 0, farmLuck: 0, fishTimeReduction: 12 }
    },
    {
        id: "panda",
        name: "Panda Petani",
        rarity: "epic",
        effectText: "+25% Panen Ladang, -25% Waktu Tanam & +15% Gold",
        bonus: { exp: 0, gold: 0.15, fishingLuck: 0, adventureLuck: 0, farmLuck: 0.25, farmTimeReduction: 0.25, fishTimeReduction: 0 }
    },
    {
        id: "peri_flora",
        name: "Peri Flora Hijau",
        rarity: "epic",
        effectText: "-30% Waktu Tanam Ladang, +15% Panen Ladang & +10% EXP",
        bonus: { exp: 0.10, gold: 0, fishingLuck: 0, adventureLuck: 0, farmLuck: 0.15, farmTimeReduction: 0.30, fishTimeReduction: 0 }
    },
    {
        id: "elang",
        name: "Elang Pengelana",
        rarity: "epic",
        effectText: "+25% Hoki Adventure, +15% EXP & +10% Gold",
        bonus: { exp: 0.15, gold: 0.10, fishingLuck: 0, adventureLuck: 0.25, farmLuck: 0, fishTimeReduction: 0 }
    },

    // === LEGENDARY (Kompleks & Sangat Kuat) ===
    {
        id: "serigala",
        name: "Serigala Es",
        rarity: "legendary",
        effectText: "+18% Hoki Mancing, Pangkas -15d Mancing, +20% EXP & +20% Gold",
        bonus: { exp: 0.20, gold: 0.20, fishingLuck: 0.18, adventureLuck: 0.15, farmLuck: 0, fishTimeReduction: 15 }
    },
    {
        id: "harimau",
        name: "Harimau Rimba Emas",
        rarity: "legendary",
        effectText: "+35% Gold, +30% Hoki Adventure & +20% EXP",
        bonus: { exp: 0.20, gold: 0.35, fishingLuck: 0, adventureLuck: 0.30, farmLuck: 0, fishTimeReduction: 0 }
    },
    {
        id: "kura_kuno",
        name: "Kura-Kura Kuno Gaia",
        rarity: "legendary",
        effectText: "+40% Panen Ladang, -35% Waktu Tanam, +15% Hoki Mancing & +20% EXP",
        bonus: { exp: 0.20, gold: 0.10, fishingLuck: 0.15, adventureLuck: 0, farmLuck: 0.40, farmTimeReduction: 0.35, fishTimeReduction: 0 }
    },

    // === MYTHIC (Dewa Segala Bidang - Multi-Stat OP) ===
    {
        id: "naga",
        name: "Naga Api Purba",
        rarity: "mythic",
        effectText: "+40% EXP, +40% Gold, +25% Hoki Mancing, +35% Hoki Adventure & Pangkas -20d Mancing",
        bonus: { exp: 0.40, gold: 0.40, fishingLuck: 0.25, adventureLuck: 0.35, farmLuck: 0.25, fishTimeReduction: 20 }
    },
    {
        id: "phoenix",
        name: "Burung Phoenix Abadi",
        rarity: "mythic",
        effectText: "+50% EXP, +50% Panen Ladang, -40% Waktu Tanam, +30% Hoki Adv & +30% Gold",
        bonus: { exp: 0.50, gold: 0.30, fishingLuck: 0.15, adventureLuck: 0.30, farmLuck: 0.50, farmTimeReduction: 0.40, fishTimeReduction: 10 }
    },
    {
        id: "leviathan_pet",
        name: "Bayi Leviathan Laut Dalam",
        rarity: "mythic",
        effectText: "+35% Hoki Mancing, Pangkas -25d Mancing, +30% Gold Mancing & +30% EXP",
        bonus: { exp: 0.30, gold: 0.30, fishingLuck: 0.35, adventureLuck: 0.15, farmLuck: 0, fishTimeReduction: 25 }
    }
];
