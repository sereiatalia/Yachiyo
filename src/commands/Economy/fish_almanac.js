import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { RARITY_ORDER, RARITY_CONFIG, FISH_TYPES, formatMoney } from './modules/fishConfig.js';

const RARITY_BLOCKS = {
    common: '🟫', uncommon: '🟩', rare: '🟦', epic: '🟪', 
    legendary: '🟨', mythic: '🟥', celestial: '🌠', secret: '💖'
};

export default {
    data: new SlashCommandBuilder()
        .setName('almanac')
        .setDescription('View your caught fish and sell them for cash!')
        .addSubcommand(sub => 
            sub.setName('view').setDescription('View your beautiful fish collection'))
        .addSubcommand(sub => 
            sub.setName('sell')
            .setDescription('Sell your caught fish')
            .addStringOption(opt => 
                opt.setName('rarity')
                .setDescription('Which rarity to sell?')
                .setRequired(true)
                .addChoices(
                    { name: 'Sell All Fish', value: 'all' },
                    ...RARITY_ORDER.map(r => ({ name: `Sell ${RARITY_CONFIG[r].label}s`, value: r }))
                )
            )),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const sub = interaction.options.getSubcommand();
        
        const userData = await getEconomyData(client, guildId, userId);
        userData.fishInventory = userData.fishInventory || {};

        if (sub === 'view') {
            let description = '';
            let totalValue = 0;
            const summary = [];

            for (const rarity of RARITY_ORDER) {
                const fishInRarity = FISH_TYPES.filter(f => f.rarity === rarity);
                if (fishInRarity.length === 0) continue;

                const block = RARITY_BLOCKS[rarity] || '⬛';
                let line = `${block} | `;
                let countForRarity = 0;

                for (const fish of fishInRarity) {
                    const count = userData.fishInventory[fish.name] || 0;
                    countForRarity += count;
                    totalValue += count * RARITY_CONFIG[rarity].sellPrice;
                    
                    // Format like: 🐟 `001`
                    line += `${fish.emoji} \`${count.toString().padStart(3, '0')}\` `;
                }

                description += line.trim() + '\n';
                const initial = rarity.charAt(0).toUpperCase() + (rarity === 'celestial' ? 'e' : '');
                summary.push(`${initial}-${countForRarity}`);
            }

            const embed = createEmbed({
                title: `🌿 🐟 ${interaction.user.username}'s Almanac 🐟 🌿`,
                description: description,
                color: '#1ABC9C',
            })
            .addFields({ name: 'Aquarium Value', value: `**${formatMoney(totalValue)}**`, inline: false })
            .setFooter({ text: summary.join(', ') });

            return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        if (sub === 'sell') {
            const target = interaction.options.getString('rarity');
            let earned = 0;
            let soldCount = 0;

            for (const fish of FISH_TYPES) {
                // If targeting a specific rarity, skip fish that don't match
                if (target !== 'all' && fish.rarity !== target) continue;

                const count = userData.fishInventory[fish.name] || 0;
                if (count > 0) {
                    const price = RARITY_CONFIG[fish.rarity].sellPrice;
                    earned += (count * price);
                    soldCount += count;
                    // Remove fish from inventory upon selling
                    userData.fishInventory[fish.name] = 0; 
                }
            }

            if (soldCount === 0) {
                throw createError('No Fish', ErrorTypes.VALIDATION, `You don't have any fish in this category to sell!`);
            }

            userData.wallet += earned;
            await setEconomyData(client, guildId, userId, userData);

            const label = target === 'all' ? 'All Fish' : `${RARITY_CONFIG[target].label} Fish`;
            const embed = createEmbed({
                title: '💰 Fish Sold!',
                description: `You sold **${soldCount}**x *${label}* to the market.\n\nYou earned **${formatMoney(earned)}**!`,
                color: '#F1C40F',
            }).addFields({ name: 'New Balance', value: formatMoney(userData.wallet), inline: true });

            return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }
    }, { command: 'almanac' })
};
