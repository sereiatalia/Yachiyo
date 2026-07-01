import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { RODS, getEquippedRod, formatMoney } from '../../utils/fishConfig.js';

export default {
    data: new SlashCommandBuilder()
        .setName('fish_shop')
        .setDescription('Buy fishing rods to improve your odds and rewards')
        .addSubcommand(sub =>
            sub.setName('view').setDescription('View the fishing rod shop'))
        .addSubcommand(sub =>
            sub
                .setName('buy')
                .setDescription('Buy a fishing rod')
                .addStringOption(opt =>
                    opt
                        .setName('rod')
                        .setDescription('The rod to buy')
                        .setRequired(true)
                        .addChoices(...RODS.map(r => ({ name: r.name, value: r.id }))))),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const sub = interaction.options.getSubcommand();

        const userData = await getEconomyData(client, guildId, userId);
        userData.inventory = userData.inventory || {};

        if (sub === 'view') {
            const equipped = getEquippedRod(userData);

            const embed = createEmbed({
                title: '🎣 Fishing Rod Shop',
                description:
                    'Better rods mean bigger catches and better odds at rare fish.\n' +
                    'Use `/fish_shop buy` to purchase one — your highest-tier rod is always equipped automatically.',
                color: '#1ABC9C',
            });

            for (const rod of RODS) {
                const owned = !!userData.inventory[rod.id];
                const isEquipped = equipped?.id === rod.id;
                const status = isEquipped ? '✅ Equipped' : owned ? '📦 Owned' : formatMoney(rod.price);

                embed.addFields({
                    name: `${rod.emoji} ${rod.name}`,
                    value: `${rod.description}\n**Price:** ${status}`,
                    inline: false,
                });
            }

            embed
                .addFields({ name: '💰 Your Balance', value: formatMoney(userData.wallet), inline: false })
                .setFooter({ text: 'Bigger rods, bigger catches 🎣' });

            return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        if (sub === 'buy') {
            const rodId = interaction.options.getString('rod');
            const rod = RODS.find(r => r.id === rodId);

            if (!rod) {
                throw createError('Invalid rod', ErrorTypes.VALIDATION, "That rod doesn't exist in the shop.");
            }

            if (userData.inventory[rod.id]) {
                throw createError('Already owned', ErrorTypes.VALIDATION, `You already own the **${rod.name}**!`);
            }

            if (userData.wallet < rod.price) {
                throw createError(
                    'Insufficient funds',
                    ErrorTypes.VALIDATION,
                    `You need **${formatMoney(rod.price)}** to buy the **${rod.name}**, but you only have **${formatMoney(userData.wallet)}**.`
                );
            }

            userData.wallet -= rod.price;
            userData.inventory[rod.id] = true;
            await setEconomyData(client, guildId, userId, userData);

            const embed = createEmbed({
                title: '✅ Purchase Complete!',
                description: `You bought the **${rod.emoji} ${rod.name}**!\n${rod.description}`,
                color: '#2ECC71',
            })
                .addFields({ name: '💰 New Balance', value: formatMoney(userData.wallet), inline: true })
                .setFooter({ text: 'Go catch something big! 🎣' });

            return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }
    }, { command: 'fish_shop' })
};
