// fishConfig.js
// Shared configuration and helper functions for the fishing game system.
// Used by /fish, /fish_shop, and /fish_leaderboard so odds, rewards, and
// rod behavior only live in one place.

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'secret'];

export const RARITY_CONFIG = {
    common:    { label: 'Common',    emoji: '⭐',    color: '#95A5A6', chance: 0.35, reward: [1, 20] },
    uncommon:  { label: 'Uncommon',  emoji: '⭐⭐',   color: '#2ECC71', chance: 0.25, reward: [15, 40] },
    rare:      { label: 'Rare',      emoji: '⭐⭐⭐',  color: '#3498DB', chance: 0.15, reward: [35, 65] },
    epic:      { label: 'Epic',      emoji: '⭐⭐⭐⭐', color: '#9B59B6', chance: 0.08, reward: [55, 90] },
    legendary: { label: 'Legendary', emoji: '🌟',    color: '#F1C40F', chance: 0.04, reward: [80, 150], pity: 100 },
    mythic:    { label: 'Mythic',    emoji: '💠',    color: '#E74C3C', chance: 0.02, reward: [200, 500], pity: 300 },
    secret:    { label: 'Secret',    emoji: '👑',    color: '#FF69B4', chance: 0.01, reward: [100000, 100000], pity: 1000 },
};

// Non-fish outcomes. These + all RARITY_CONFIG chances above should sum to 1.0
// (0.05 + 0.05 + 0.35 + 0.25 + 0.15 + 0.08 + 0.04 + 0.02 + 0.01 = 1.00).
export const ESCAPE_CHANCE = 0.05;
export const JUNK_CHANCE = 0.05;

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
    { name: 'Kokomi',            emoji: '👸', rarity: 'secret' },
];

export const JUNK_TYPES = [
    { name: 'Old Boot',         emoji: '👢' },
    { name: 'Tin Can',          emoji: '🥫' },
    { name: 'Tangled Net',      emoji: '🕸️' },
    { name: 'Broken Bottle',    emoji: '🍾' },
    { name: 'Soggy Newspaper',  emoji: '📰' },
];

export const ESCAPE_MESSAGES = [
    'The line went slack — it got away right at the surface!',
    'A sudden splash, and the fish snapped the line clean off!',
    'You reeled in... nothing but water. It slipped the hook.',
    'So close! It thrashed free just before you could net it.',
];

export const CATCH_MESSAGES = [
    'You cast your line into the crystal clear waters...',
    'You wait patiently as your bobber floats...',
    'After a few minutes of waiting, you feel a tug...',
    'The water ripples as something takes your bait...',
    'You reel in your catch with expert precision...',
];

// Fishing rods available in the shop. Higher tier = higher price, bigger
// payout bonus, and better odds (via luckBonus, see buildOutcomeTable).
export const RODS = [
    { id: 'basic_rod',    name: 'Basic Fishing Rod',    emoji: '🎣', price: 5000,    valueBonus: 0.25, luckBonus: 0.02, description: '+25% catch value, slightly better odds' },
    { id: 'advanced_rod', name: 'Advanced Fishing Rod', emoji: '🎣', price: 25000,   valueBonus: 0.50, luckBonus: 0.05, description: '+50% catch value, better odds' },
    { id: 'master_rod',   name: 'Master Fishing Rod',   emoji: '🎣', price: 100000,  valueBonus: 1.00, luckBonus: 0.10, description: '+100% catch value, great odds' },
    { id: 'mythic_rod',   name: 'Mythical Rod',         emoji: '🎣', price: 500000,  valueBonus: 1.50, luckBonus: 0.20, description: '+150% catch value, best odds, rarer junk/escapes' },
];

/**
 * Returns the highest-tier rod a user owns, or null.
 * Also treats a legacy `inventory.fishing_rod` boolean (from the old system)
 * as equivalent to owning the Basic Fishing Rod, for backwards compatibility.
 */
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

/**
 * Builds the effective outcome -> probability weight table after applying
 * the equipped rod's luck bonus. The rod shifts weight away from escape/junk
 * and into legendary/mythic/secret (weighted more toward the rarer tiers).
 */
export function buildOutcomeTable(rod) {
    const luck = rod?.luckBonus || 0;

    const escape = Math.max(0.005, ESCAPE_CHANCE - luck / 2);
    const junk = Math.max(0.005, JUNK_CHANCE - luck / 2);
    const reclaimed = (ESCAPE_CHANCE - escape) + (JUNK_CHANCE - junk);

    const boostWeights = { legendary: 0.5, mythic: 0.3, secret: 0.2 };

    const table = { escape, junk };
    for (const rarity of RARITY_ORDER) {
        const boost = boostWeights[rarity] ? reclaimed * boostWeights[rarity] : 0;
        table[rarity] = RARITY_CONFIG[rarity].chance + boost;
    }
    return table;
}

/** Rolls a single outcome key ('escape' | 'junk' | a rarity name) from a weight table. */
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

/**
 * Applies the pity system. Every cast counts as a "pull" toward legendary,
 * mythic, and secret guarantees. If a threshold is hit, the outcome is
 * forced to that tier (or better) regardless of the random roll.
 * Mutates userData.fishPity and returns the final outcome key to use.
 */
export function applyPity(userData, rolledOutcome) {
    if (!userData.fishPity) {
        userData.fishPity = { legendary: 0, mythic: 0, secret: 0 };
    }
    const pity = userData.fishPity;

    pity.legendary = (pity.legendary || 0) + 1;
    pity.mythic = (pity.mythic || 0) + 1;
    pity.secret = (pity.secret || 0) + 1;

    let forced = null;
    if (pity.secret >= RARITY_CONFIG.secret.pity) forced = 'secret';
    else if (pity.mythic >= RARITY_CONFIG.mythic.pity) forced = 'mythic';
    else if (pity.legendary >= RARITY_CONFIG.legendary.pity) forced = 'legendary';

    const finalOutcome = forced || rolledOutcome;

    if (finalOutcome === 'secret') {
        pity.legendary = 0; pity.mythic = 0; pity.secret = 0;
    } else if (finalOutcome === 'mythic') {
        pity.legendary = 0; pity.mythic = 0;
    } else if (finalOutcome === 'legendary') {
        pity.legendary = 0;
    }

    return finalOutcome;
}

/** Records a successful fish catch (by rarity) into userData for the leaderboard. */
export function recordCatch(userData, outcome) {
    if (!userData.fishStats) userData.fishStats = {};
    for (const r of RARITY_ORDER) {
        if (userData.fishStats[r] === undefined) userData.fishStats[r] = 0;
    }
    if (RARITY_ORDER.includes(outcome)) {
        userData.fishStats[outcome] = (userData.fishStats[outcome] || 0) + 1;
    }
}

// Weighted score for leaderboard ranking — rarer catches count for far more
// than raw catch count so one Kokomi outranks a pile of Bass.
const RARITY_SCORE = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 60, mythic: 200, secret: 5000 };

export function fishScore(fishStats) {
    if (!fishStats) return 0;
    return RARITY_ORDER.reduce((sum, r) => sum + (fishStats[r] || 0) * RARITY_SCORE[r], 0);
}
