import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { RARITY_ORDER, RARITY_CONFIG, FISH_TYPES, formatMoney } from './modules/fishConfig.js';

export default {
    data: new SlashCommandBuilder()
        .setName('almanac')
        .setDescription('View your caught fish and sell them for cash! ( ˶ˆᗜˆ˵ )')
        .addSubcommand(sub => 
            sub.setName('view').setDescription('View your beautiful fish collection ✨'))
        .addSubcommand(sub => 
            sub.setName('sell')
            .setDescription('Sell your caught fish by rarity category 💰')
            .addStringOption(opt => 
                opt.setName('rarity')
                .setDescription('Which rarity to sell?')
                .setRequired(true)
                .addChoices(
                    { name: 'Sell All Fish', value: 'all' },
                    ...RARITY_ORDER.map(r => ({ name: `Sell ${RARITY_CONFIG[r].label}s`, value: r }))
                )
            ))
        .addSubcommand(sub => 
            sub.setName('sell_specific')
            .setDescription('Sell a specific amount of a specific fish 🎀')
            .addStringOption(opt => 
                opt.setName('fish_name')
                .setDescription('The exact name of the fish you want to sell (e.g., Tuna, Kokomi)')
                .setRequired(true)
            )
            .addIntegerOption(opt => 
                opt.setName('quantity')
                .setDescription('How many do you want to sell?')
                .setRequired(true)
                .setMinValue(1)
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

                let pageText = `🫧 ⋆｡𖦹 °.⋆ **${interaction.user.username.toUpperCase()}'S AQUARIUM** ⋆.° 𖦹 🫧 ૮ ˶ᵔ ᵕ ᵔ˶ ა\n\n`;
                pageText += `✨ **${RARITY_CONFIG[rarity].label} Collection** ✨:\n\n`;
                
                let index = 1;
                for (const fish of fishInRarity) {
                    const count = userData.fishInventory[fish.name] || 0;
                    const price = formatMoney(RARITY_CONFIG[rarity].sellPrice);
                    
                    pageText += `**${index}. ${fish.emoji} ${fish.name}**\n`;
                    pageText += `╰┈➤ 🎣 Caught: **${count}**\n`;
                    pageText += `╰┈➤ 💰 Selling Price: **${price}**\n\n`;
                    index++;
                }

                // Add selling instructions at the bottom of the page
                pageText += `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
                pageText += `     🎀 **How to sell your fishies!** 🎀   \n`;
                pageText += `  • \`/almanac sell rarity:${rarity}\` ➜ sell all ${RARITY_CONFIG[rarity].label}s!\n`;
                pageText += `  • \`/almanac sell rarity:all\` ➜ sell EVERYTHING! 💸\n`;
                pageText += `  • \`/almanac sell_specific fish_name:Name quantity:Amount\`\n`;
                pageText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

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
                        return i.reply({ content: "( ｡ •̀ ᴖ •́ ｡) Hey! You cannot use these buttons.", ephemeral: true });
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
                throw createError('No Fish', ErrorTypes.VALIDATION, `(╥﹏╥) You don't have any fish in this category to sell! Go catch some first! 🎣`);
            }

            userData.wallet += earned;
            await setEconomyData(client, guildId, userId, userData);

            const label = target === 'all' ? 'All Fish' : `${RARITY_CONFIG[target].label} Fish`;
            
            let sellMessage = `(๑>◡<๑) **SALE SUCCESSFUL!** 🎉\n\n`;
            sellMessage += `You sold **${soldCount}**x *${label}* to the market~!\n`;
            sellMessage += `You earned: **${formatMoney(earned)}** 💖\n`;
            sellMessage += `💰 New Balance: **${formatMoney(userData.wallet)}** ✧`;

            return InteractionHelper.safeEditReply(interaction, { content: sellMessage });
        }

        if (sub === 'sell_specific') {
            const fishNameInput = interaction.options.getString('fish_name');
            const quantity = interaction.options.getInteger('quantity');

            // Find the fish in the configuration (case-insensitive)
            const fish = FISH_TYPES.find(f => f.name.toLowerCase() === fishNameInput.toLowerCase());

            if (!fish) {
                throw createError('Invalid Fish', ErrorTypes.VALIDATION, `( ˘︹˘ ) I couldn't find a fish named **${fishNameInput}**. Please check your spelling!`);
            }

            const currentAmount = userData.fishInventory[fish.name] || 0;

            if (currentAmount < quantity) {
                throw createError('Not Enough Fish', ErrorTypes.VALIDATION, `( ｡ •̀ ᴖ •́ ｡) You only have **${currentAmount}**x ${fish.name}. You cannot sell **${quantity}**!`);
            }

            const price = RARITY_CONFIG[fish.rarity].sellPrice;
            const earned = price * quantity;

            userData.fishInventory[fish.name] -= quantity;
            userData.wallet += earned;
            await setEconomyData(client, guildId, userId, userData);

            let sellMessage = `( ˶ˆᗜˆ˵ ) **SALE SUCCESSFUL!** 🎀\n\n`;
            sellMessage += `You sold **${quantity}**x *${fish.name}* ${fish.emoji} to the market!\n`;
            sellMessage += `You earned: **${formatMoney(earned)}** 💖\n`;
            sellMessage += `💰 New Balance: **${formatMoney(userData.wallet)}** ✨`;

            return InteractionHelper.safeEditReply(interaction, { content: sellMessage });
        }
    }, { command: 'almanac' })
};
