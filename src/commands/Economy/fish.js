import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    RARITY_CONFIG,
    CATCH_MESSAGES,
    ESCAPE_MESSAGES,
    JUNK_TYPES,
    getEquippedRod,
    buildOutcomeTable,
    rollOutcome,
    pickFish,
    rollReward,
    applyPity,
    recordCatch,
    formatMoney,
} from './modules/fishConfig.js';

// NOTE: cooldown is currently disabled (45 * 60 * 0 = 0ms). Left as-is from
// the original file — flag if you want this re-enabled.
const FISH_COOLDOWN = 45 * 60 * 50;

export default {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Go fishing to catch fish and earn money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        userData.inventory = userData.inventory || {};
        const lastFish = userData.lastFish || 0;

        if (now < lastFish + FISH_COOLDOWN) {
            const remaining = lastFish + FISH_COOLDOWN - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            throw createError(
                "Fishing cooldown active",
                ErrorTypes.RATE_LIMIT,
                `You're too tired to fish right now. Rest for **${hours}h ${minutes}m** before fishing again.`,
                { remaining, cooldownType: 'fish' }
            );
        }

        const rod = getEquippedRod(userData);
        const table = buildOutcomeTable(rod);
        const rolledOutcome = rollOutcome(table);
        const outcome = applyPity(userData, rolledOutcome);

        const catchMessage = CATCH_MESSAGES[Math.floor(Math.random() * CATCH_MESSAGES.length)];
        userData.lastFish = now;

        let embed;

        if (outcome === 'escape') {
            const flavor = ESCAPE_MESSAGES[Math.floor(Math.random() * ESCAPE_MESSAGES.length)];

            embed = createEmbed({
                title: '🎣 The One That Got Away',
                description:
                    `${catchMessage}\n\n` +
                    `${flavor}\n\n` +
                    `You earned **$0** this time.`,
                color: '#7F8C8D',
            }).setFooter({ text: 'Better luck on your next cast! 🎣' });

        } else if (outcome === 'junk') {
            const junk = JUNK_TYPES[Math.floor(Math.random() * JUNK_TYPES.length)];
            const loss = Math.min(Math.floor(Math.random() * 100) + 1, userData.wallet);
            userData.wallet -= loss;

            embed = createEmbed({
                title: '🗑️ Junk!',
                description:
                    `${catchMessage}\n\n` +
                    `You reeled in a **${junk.emoji} ${junk.name}** — worthless, and it cost you gear.\n\n` +
                    `You lost **${formatMoney(loss)}**.`,
                color: '#34495E',
            })
                .addFields({ name: '💰 New Balance', value: formatMoney(userData.wallet), inline: true })
                .setFooter({ text: 'Not every cast is a winner... 🪣' });

        } else {
            // A real fish was caught — `outcome` is the rarity key.
            const rarityInfo = RARITY_CONFIG[outcome];
            const fishCaught = pickFish(outcome);
            const baseEarned = rollReward(outcome);

            let finalEarned = baseEarned;
            let bonusLine = '';
            if (rod) {
                finalEarned = Math.floor(baseEarned * (1 + rod.valueBonus));
                bonusLine = `\n${rod.emoji} **${rod.name} Bonus: +${Math.round(rod.valueBonus * 100)}%**`;
            }

            userData.wallet += finalEarned;
            recordCatch(userData, outcome);

            const isSecret = outcome === 'secret';

            embed = createEmbed({
                title: isSecret ? '👑 A LEGEND APPEARS!' : 'Fishing Success!',
                description:
                    `${catchMessage}\n\n` +
                    `You caught **${fishCaught.emoji} ${fishCaught.name}**!\n` +
                    (isSecret
                        ? `Kokomi, priestess of the tides, blesses you with **${formatMoney(finalEarned)}**!`
                        : `You sold it for **${formatMoney(finalEarned)}**!`) +
                    bonusLine,
                color: rarityInfo.color,
            })
                .addFields(
                    { name: '💰 New Balance', value: formatMoney(userData.wallet), inline: true },
                    { name: '🏷️ Rarity', value: `${rarityInfo.label} ${rarityInfo.emoji}`, inline: true },
                )
                .setFooter({ text: 'Cast your line, catch rare fish, and earn rewards! 🎣' });
        }

        await setEconomyData(client, guildId, userId, userData);
        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'fish' })
};
