import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { RARITY_ORDER, RARITY_CONFIG, FISH_TYPES, formatMoney } from './modules/fishConfig.js';

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
            const pages = [];

            // Build a separate page for each rarity
            for (const rarity of RARITY_ORDER) {
                const fishInRarity = FISH_TYPES.filter(f => f.rarity === rarity);
                if (fishInRarity.length === 0) continue;

                let pageText = `🌿 **${interaction.user.username.toUpperCase()}'S FISH INVENTORY** 🌿\n\n`;
                pageText += `**${RARITY_CONFIG[rarity].label}:**\n`;
                
                let index = 1;
                for (const fish of fishInRarity) {
                    const count = userData.fishInventory[fish.name] || 0;
                    const price = formatMoney(RARITY_CONFIG[rarity].sellPrice);
                    
                    pageText += `${index}. ${fish.name}\n`;
                    pageText += `Caught: ${count}\n`;
                    pageText += `Selling Price: ${price}\n\n`;
                    index++;
                }

                // Add selling instructions at the bottom of the page
                pageText += `----------------------------------------\n`;
                pageText += `💡 **How to sell:**\n`;
                pageText += `Type \`/almanac sell rarity:${rarity}\` to sell all your ${RARITY_CONFIG[rarity].label} fish!\n`;
                pageText += `Type \`/almanac sell rarity:all\` to sell everything at once.`;

                pages.push(pageText);
            }

            let currentPage = 0;

            // Helper function to create the pagination buttons
            const getRow = (current) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(current === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(current === pages.length - 1)
                );
            };

            // Send the first page
            const message = await interaction.editReply({ 
                content: pages[currentPage], 
                components: pages.length > 1 ? [getRow(currentPage)] : [] 
            });

            // Handle button clicks for pagination
            if (pages.length > 1) {
                const collector = message.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: 120000 // 2 minutes before buttons expire
                });

                collector.on('collect', async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: "You cannot use these buttons.", ephemeral: true });
                    }

                    if (i.customId === 'prev') currentPage--;
                    if (i.customId === 'next') currentPage++;

                    await i.update({ 
                        content: pages[currentPage], 
                        components: [getRow(currentPage)] 
                    });
                });

                collector.on('end', () => {
                    interaction.editReply({ components: [] }).catch(() => {});
                });
            }
            return;
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
            
            // Plain text response for selling
            let sellMessage = `✅ **SALE SUCCESSFUL!**\n\n`;
            sellMessage += `You sold **${soldCount}**x *${label}* to the market.\n`;
            sellMessage += `You earned: **${formatMoney(earned)}**\n`;
            sellMessage += `💰 New Balance: **${formatMoney(userData.wallet)}**`;

            return InteractionHelper.safeEditReply(interaction, { content: sellMessage });
        }
    }, { command: 'fishalmanac' })
};
