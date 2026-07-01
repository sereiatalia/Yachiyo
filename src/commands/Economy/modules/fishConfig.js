// src/commands/Economy/modules/fishConfig.js

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'celestial', 'secret'];

export const RARITY_CONFIG = {
    common:    { label: 'Common',    emoji: '⭐',    color: '#95A5A6', chance: 0.35, reward: [1, 20], pity: 0, sellPrice: 1 },
    uncommon:  { label: 'Uncommon',  emoji: '⭐⭐',   color: '#2ECC71', chance: 0.25, reward: [15, 40], pity: 0, sellPrice: 5 },
    rare:      { label: 'Rare',      emoji: '⭐⭐⭐',  color: '#3498DB', chance: 0.15, reward: [35, 65], pity: 0, sellPrice: 20 },
    epic:      { label: 'Epic',      emoji: '⭐⭐⭐⭐', color: '#9B59B6', chance: 0.08, reward: [55, 100], pity: 0, sellPrice: 75 },
    legendary: { label: 'Legendary', emoji: '🌟',    color: '#F1C40F', chance: 0.04, reward: [100, 200], pity: 100, sellPrice: 200 },
    mythic:    { label: 'Mythic',    emoji: '💠',    color: '#E74C3C', chance: 0.02, reward: [200, 500], pity: 300, sellPrice: 500 },
    celestial: { label: 'Celestial', emoji: '💫',    color: '#5DADE2', chance: 0.001, reward: [2000, 5000], pity: 1500, sellPrice: 1500 },
    secret:    { label: 'Secret',    emoji: '👑',    color: '#FF69B4', chance: 0.000001, reward: [50000, 50000], pity: 5000, sellPrice: 5000 },
};

export const ESCAPE_CHANCE = 0.1;
export const JUNK_CHANCE = 0.1;

export const FISH_TYPES = [
    { name: 'Bass',              emoji: '🐟', rarity: 'common' },
    { name: 'Salmon',            emoji: '🐟', rarity: 'common' },
    { name: 'Trout',             emoji: '🐟', rarity: 'common' },
    { name: 'Anchovy',           emoji: '🐟', rarity: 'common' },
    { name: 'Tuna',              emoji: '🐠', rarity: 'uncommon' },
    { name: 'Swordfish',         emoji: '🐠', rarity: 'uncommon' },
    { name: 'Mackerel',          emoji: '🐠', rarity: 'uncommon' },
    { name: 'Octopus',           emoji: '🐙', rarity: 'rare' },
    { name: 'Lobster',           emoji: '🦞', rarity: 'rare' },
    { name: 'Eel',               emoji: '🐍', rarity: 'rare' },
    { name: 'Shark',             emoji: '🦈', rarity: 'epic' },
    { name: 'Manta Ray',         emoji: '🐡', rarity: 'epic' },
    { name: 'Whale',             emoji: '🐋', rarity: 'legendary' },
    { name: 'Golden Dragonfish', emoji: '🐉', rarity: 'legendary' },
    { name: 'Kraken',            emoji: '🐙', rarity: 'mythic' },
    { name: 'Leviathan',         emoji: '🌊', rarity: 'mythic' },
    // NEW FISH (Celestial Rarity)
    { name: 'Ponyo',             emoji: '🐟', rarity: 'celestial' },
    { name: 'Poseidon',          emoji: '🔱', rarity: 'celestial' },
    { name: 'Umi',               emoji: '💧', rarity: 'celestial' },
    { name: 'Aquaman',           emoji: '🔱', rarity: 'celestial' },
    { name: 'Jinbe',             emoji: '🐳', rarity: 'celestial' },
    { name: 'Nami',              emoji: '🧭', rarity: 'celestial' },
    { name: 'Kaworu',            emoji: '🌊', rarity: 'celestial' },
    { name: 'Kisame',            emoji: '🦈', rarity: 'celestial' },
    { name: 'Tamaki',            emoji: '🧜', rarity: 'celestial' },
    { name: 'Gyarados',          emoji: '🐉', rarity: 'celestial' },
    // SECRETS
    { name: 'Kokomi',            emoji: '👸', rarity: 'secret' },
    { name: 'Vodyanitsa',        emoji: '🎶', rarity: 'secret' },
    { name: 'Ariel',             emoji: '🧜‍♀️', rarity: 'secret' }
];

export const JUNK_TYPES = [
    { name: 'Old Boot',         emoji: '👢' },
    { name: 'Tin Can',          emoji: '🥫' },
    { name: 'Tangled Net',      emoji: '🕸️' },
    { name: 'Broken Bottle',    emoji: '🍾' },
    { name: 'Soggy Newspaper',  emoji: '📰' },
];

export const ESCAPE_MESSAGES = [
    'With a mighty leap, the fish spat out the lure and vanished.',
    'Your knot failed at the last second! The prize is gone.',
    'It buried itself in the weeds and managed to shake the hook.',
    'The drag screamed, the rod bowed, and then... nothing.',
    'A swift roll in the mud and the tricky fish threw the hook.',
    'You pulled too hard! The hook tore free and the fish swam away.',
    'Just as you reached for the net, it made one last desperate run and broke off.'
];

export const CATCH_MESSAGES = [
    'You cast your line into the crystal clear waters...',
    'You wait patiently as your bobber floats...',
    'After a few minutes of waiting, you feel a tug...',
    'The water ripples as something takes your bait...',
    'You reel in your catch with expert precision...',
    'A massive shadow circles your bait before striking hard!',
    'You set the hook perfectly as the bobber suddenly dives under...',
    'After a grueling battle, you finally bring the exhausted fish to the shore...',
    'Your rod bends double as a true heavyweight takes the line...',
    'You carefully guide the thrashing fish into your waiting net...',
    'A gentle nibble turns into a fierce bite!',
    'The reel sings as you fight to reel in a magnificent catch...'
];

export const RODS = [
    { id: 'basic_rod',    name: 'Basic Fishing Rod',    emoji: '🎣', price: 5000,    valueBonus: 0.25, luckBonus: 0.02, description: '+25% catch value, slightly better odds' },
    { id: 'advanced_rod', name: 'Advanced Fishing Rod', emoji: '🎣', price: 25000,   valueBonus: 0.50, luckBonus: 0.05, description: '+50% catch value, better odds' },
    { id: 'master_rod',   name: 'Master Fishing Rod',   emoji: '🎣', price: 100000,  valueBonus: 1.00, luckBonus: 0.10, description: '+100% catch value, great odds' },
    { id: 'mythic_rod',   name: 'Mythical Rod',         emoji: '🎣', price: 700000,  valueBonus: 1.50, luckBonus: 0.20, description: '+150% catch value, best odds, rarer junk/escapes' },
];

export function getEquippedRod(userData) {
    const owned = RODS.filter(r => userData.inventory?.[r.id]);
    if (userData.inventory?.['fishing_rod'] && !owned.find(r => r.id === 'basic_rod')) {
        owned.push(RODS[0]);
    }
    if (owned.length === 0) return null;
    return owned.reduce((best, r) => (r.price > best.price ? r : best), owned[0]);
}

export function formatMoney(n) {
    return `$${Math.trunc(n).toLocaleString()}`;
}

export function buildOutcomeTable(rod) {
    const luck = rod?.luckBonus || 0;
    const table = { 
        escape: Math.max(0.005, ESCAPE_CHANCE - luck / 2), 
        junk: Math.max(0.005, JUNK_CHANCE - luck / 2) 
    };
    
    const remaining = 1 - (table.escape + table.junk);

    let secretChance = 0.000001 + (luck * 0.0001); 
    if (rod?.id === 'mythic_rod') secretChance = 0.01; 
    else if (rod?.id === 'master_rod') secretChance = 0.0001; 
    
    table.secret = secretChance;
    table.celestial = 0.005 + luck;
    
    const pool = remaining - (table.secret + table.celestial);
    for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']) {
        table[r] = pool * (RARITY_CONFIG[r].chance / 0.95);
    }
    return table;
}

export function rollOutcome(table) {
    const entries = Object.entries(table);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
        if (roll < weight) return key;
        roll -= weight;
    }
    return entries[entries.length - 1][0];
}

export function pickFish(rarity) {
    const pool = FISH_TYPES.filter(f => f.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
}

export function rollReward(rarity) {
    const [min, max] = RARITY_CONFIG[rarity].reward;
    if (min === max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function applyPity(userData, rolledOutcome) {
    const nowString = new Date().toDateString();
    if (userData.lastDailyReset !== nowString) {
        userData.lastDailyReset = nowString;
        userData.dailySecretCount = 0;
    }

    if (!userData.fishPity) userData.fishPity = { legendary: 0, mythic: 0, celestial: 0, secret: 0 };
    const pity = userData.fishPity;

    pity.legendary++; pity.mythic++; pity.celestial++; pity.secret++;

    let forced = null;
    if (pity.secret >= RARITY_CONFIG.secret.pity && userData.dailySecretCount < 3) forced = 'secret';
    else if (pity.celestial >= RARITY_CONFIG.celestial.pity) forced = 'celestial';
    else if (pity.mythic >= RARITY_CONFIG.mythic.pity) forced = 'mythic';
    else if (pity.legendary >= RARITY_CONFIG.legendary.pity) forced = 'legendary';

    let finalOutcome = forced || rolledOutcome;
    if (finalOutcome === 'secret' && userData.dailySecretCount >= 3) finalOutcome = 'celestial';

    if (finalOutcome === 'secret') {
        userData.dailySecretCount++;
        pity.legendary = 0; pity.mythic = 0; pity.celestial = 0; pity.secret = 0;
    } else if (finalOutcome === 'celestial') {
        pity.legendary = 0; pity.mythic = 0; pity.celestial = 0;
    } else if (finalOutcome === 'mythic') {
        pity.legendary = 0; pity.mythic = 0;
    } else if (finalOutcome === 'legendary') {
        pity.legendary = 0;
    }

    return finalOutcome;
}

// UPDATE: Now records specific fish to the user's Fish Inventory!
export function recordCatch(userData, outcome, fishName) {
    if (!userData.fishStats) userData.fishStats = {};
    if (!userData.fishInventory) userData.fishInventory = {}; // New!

    // Leaderboard stats
    for (const r of RARITY_ORDER) {
        if (userData.fishStats[r] === undefined) userData.fishStats[r] = 0;
    }
    if (RARITY_ORDER.includes(outcome)) {
        userData.fishStats[outcome] = (userData.fishStats[outcome] || 0) + 1;
    }

    // Almanac specific tracking
    if (fishName) {
        userData.fishInventory[fishName] = (userData.fishInventory[fishName] || 0) + 1;
    }
}

const RARITY_SCORE = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 60, mythic: 200, celestial: 1000, secret: 10000 };

export function fishScore(fishStats) {
    if (!fishStats) return 0;
    return RARITY_ORDER.reduce((sum, r) => sum + (fishStats[r] || 0) * RARITY_SCORE[r], 0);
}
