import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { RARITY_ORDER, RARITY_CONFIG, fishScore } from './modules/fishConfig.js';

const LEADERBOARD_SIZE = 10;

/**
 * Reads every user's economy record for this guild directly from client.db,
 * matching the same key pattern used in economy_dashboard.js:
 *   economy:{guildId}:{userId}
 */
async function getAllEconomyData(client, guildId) {
    const keys = await client.db.list(`economy:${guildId}:`);
    if (!keys || keys.length === 0) return [];

    const results = [];
    for (const key of keys) {
        const userId = key.split(':').pop();
        const userData = await client.db.get(key, {});
        results.push({ userId, ...userData });
    }
    return results;
}

export default {
    data: new SlashCommandBuilder()
        .setName('fishleaderboard')
        .setDescription('See who has caught the best fish in this server'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;

        const allUsers = await getAllEconomyData(client, guildId);

        const ranked = allUsers
            .map(u => ({ userId: u.userId, score: fishScore(u.fishStats), stats: u.fishStats || {} }))
            .filter(u => u.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, LEADERBOARD_SIZE);

        if (ranked.length === 0) {
            const embed = createEmbed({
                title: '🏆 Fishing Leaderboard',
                description: 'Nobody has caught any fish yet. Go use `/fish`!',
                color: '#95A5A6',
            });
            return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = ranked.map((u, i) => {
            const rank = medals[i] || `**#${i + 1}**`;
            const bestRarity = [...RARITY_ORDER].reverse().find(r => (u.stats[r] || 0) > 0);
            const bestLabel = bestRarity
                ? `${RARITY_CONFIG[bestRarity].emoji} ${RARITY_CONFIG[bestRarity].label}`
                : '—';
            const totalCaught = RARITY_ORDER.reduce((sum, r) => sum + (u.stats[r] || 0), 0);

            return `${rank} <@${u.userId}> — **${u.score.toLocaleString()} pts**\n> Best catch: ${bestLabel} • Total fish: ${totalCaught}`;
        });

        const embed = createEmbed({
            title: '🏆 Fishing Leaderboard',
            description: lines.join('\n\n'),
            color: '#F1C40F',
        }).setFooter({ text: 'Ranked by rarity-weighted score 🎣' });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'fishleaderboard' })
};
