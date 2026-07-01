import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    Collection
} from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { addMoney, getEconomyData, removeMoney } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MAX_WRONG = 5;
const GAME_TIME = 5 * 60 * 1000; // 5 minutes

// Setup a cooldown collection strictly for the Easy difficulty
const easyCooldowns = new Collection();
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// Difficulty configurations
const DIFFICULTIES = {
    easy: {
        name: 'Easy',
        fee: 0,
        minReward: 20,
        maxReward: 100,
        words: [
            'apple', 'cat', 'dog', 'sun', 'tree', 'book', 'fish', 'bird', 
            'cake', 'shoe', 'hat', 'milk', 'door', 'moon', 'star', 'rain'
        ]
    },
    medium: {
        name: 'Medium',
        fee: 250,
        minReward: 500,
        maxReward: 1500,
        words: [
            'guitar', 'planet', 'castle', 'dragon', 'forest', 'wizard', 
            'rocket', 'bridge', 'jungle', 'puzzle', 'shadow', 'temple', 
            'window', 'cactus', 'engine', 'garden', 'harbor', 'island'
        ]
    },
    hard: {
        name: 'Hard',
        fee: 1000,
        minReward: 2000,
        maxReward: 5000,
        words: [
            'quartz', 'zombie', 'yacht', 'rhythm', 'symphony', 'paradox', 
            'chrysanthemum', 'labyrinth', 'zephyr', 'kiosk', 'pharaoh', 
            'sphinx', 'mnemonic', 'pseudonym', 'xylophone', 'bourgeoisie'
        ]
    }
};

// Single page layout using 25 buttons (Y and Z are combined)
const KEYBOARD_ROWS = [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'YZ']
];

function renderWord(word, guessed) {
    return word
        .toUpperCase()
        .split('')
        .map(ch => (guessed.has(ch) ? ch : '_'))
        .join(' ');
}

// Dynamically creates the heart lifepoint bar string based on current wrong answers
function renderHearts(wrongCount) {
    const totalLives = MAX_WRONG;
    const currentLives = totalLives - wrongCount;
    
    const filledHearts = '❤️'.repeat(Math.max(0, currentLives));
    const emptyHearts = '🤍'.repeat(Math.max(0, wrongCount));
    
    return `${filledHearts}${emptyHearts}\n**${currentLives} / ${totalLives}**`;
}

function buildEmbed(state, reward, resultText = null) {
    const revealed = renderWord(state.word, state.guessed);
    const heartDisplay = renderHearts(state.wrong);

    const embed = createEmbed({
        title: `💕 GUESS THE WORD (${state.difficultyName}) 💕`,
        description: `**Lives**\n${heartDisplay}`,
        // Use hot pink/red colors to give it that "Guess the Word" theme aesthetic
        color: state.wrong >= MAX_WRONG ? '#E74C3C' : '#FF69B4',
    }).addFields({ name: `Word (${state.word.length} letters)`, value: `\`${revealed}\``, inline: false });

    if (resultText) {
        embed.addFields({ name: '\u200b', value: resultText, inline: false });
    }

    embed.setFooter({ text: `Win up to $${reward} • Fee: $${state.fee}` });
    return embed;
}

function letterButton(key, state) {
    const isYZ = key === 'YZ';
    
    const guessed = isYZ ? (state.guessed.has('Y') || state.guessed.has('Z')) : state.guessed.has(key);
    
    const isCorrect = isYZ 
        ? (state.word.toUpperCase().includes('Y') || state.word.toUpperCase().includes('Z')) 
        : state.word.toUpperCase().includes(key);

    const button = new ButtonBuilder()
        .setCustomId(`hangman_guess_${key}`)
        .setLabel(isYZ ? 'Y / Z' : key)
        .setDisabled(guessed || state.finished);

    if (guessed) {
        button.setStyle(isCorrect ? ButtonStyle.Success : ButtonStyle.Danger);
    } else {
        button.setStyle(ButtonStyle.Primary);
    }

    return button;
}

function buildRows(state) {
    return KEYBOARD_ROWS.map(rowLetters =>
        new ActionRowBuilder().addComponents(rowLetters.map(key => letterButton(key, state)))
    );
}

export default {
    category: 'Economy',
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Guess the hidden word to win cash!')
        .addStringOption(option => 
            option.setName('difficulty')
                .setDescription('Select the difficulty level')
                .setRequired(true)
                .addChoices(
                    { name: 'Easy (Free, 5m cooldown, Win up to $100)', value: 'easy' },
                    { name: 'Medium ($250 fee, Win up to $1.5k)', value: 'medium' },
                    { name: 'Hard ($1000 fee, Win up to $5k)', value: 'hard' }
                )
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const difficultyKey = interaction.options.getString('difficulty');
        const diffConfig = DIFFICULTIES[difficultyKey];
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        if (difficultyKey === 'easy') {
            const lastPlayed = easyCooldowns.get(userId);
            if (lastPlayed && Date.now() - lastPlayed < COOLDOWN_TIME) {
                const remainingMinutes = Math.ceil((COOLDOWN_TIME - (Date.now() - lastPlayed)) / 1000 / 60);
                return interaction.reply({ 
                    content: `⏳ Easy mode is on cooldown. Try again in **${remainingMinutes} minute(s)**, or try a harder difficulty!`, 
                    ephemeral: true 
                });
            }
        }

        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        if (diffConfig.fee > 0) {
            const ecoData = await getEconomyData(client, guildId, userId);
            const walletBalance = ecoData?.wallet || 0;

            if (walletBalance < diffConfig.fee) {
                return InteractionHelper.safeEditReply(interaction, { 
                    content: `❌ You need at least **$${diffConfig.fee}** in your wallet to play on ${diffConfig.name} difficulty.` 
                });
            }
            await removeMoney(client, guildId, userId, diffConfig.fee, 'wallet');
        }

        if (difficultyKey === 'easy') {
            easyCooldowns.set(userId, Date.now());
        }

        const word = diffConfig.words[Math.floor(Math.random() * diffConfig.words.length)];
        const rewardAmount = Math.floor(Math.random() * (diffConfig.maxReward - diffConfig.minReward + 1)) + diffConfig.minReward;

        const state = {
            word,
            guessed: new Set(),
            wrong: 0,
            finished: false,
            difficultyName: diffConfig.name,
            fee: diffConfig.fee
        };

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [buildEmbed(state, diffConfig.maxReward)],
            components: buildRows(state),
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: GAME_TIME,
        });

        collector.on('collect', async i => {
            const key = i.customId.replace('hangman_guess_', '');
            let madeMistake = false;

            if (key === 'YZ') {
                state.guessed.add('Y');
                state.guessed.add('Z');
                if (!word.toUpperCase().includes('Y') && !word.toUpperCase().includes('Z')) {
                    madeMistake = true;
                }
            } else {
                state.guessed.add(key);
                if (!word.toUpperCase().includes(key)) {
                    madeMistake = true;
                }
            }

            if (madeMistake) {
                state.wrong += 1;
            }

            const wordComplete = word
                .toUpperCase()
                .split('')
                .every(ch => state.guessed.has(ch));

            if (wordComplete) {
                state.finished = true;
                await addMoney(client, interaction.guildId, interaction.user.id, rewardAmount, 'wallet');
                await i.update({
                    embeds: [buildEmbed(state, diffConfig.maxReward, `🎉 **You won!** The word was **${word.toUpperCase()}**.\nYou earned **$${rewardAmount}**!`)],
                    components: buildRows(state),
                });
                collector.stop('won');
                return;
            }

            if (state.wrong >= MAX_WRONG) {
                state.finished = true;
                state.guessed = new Set(word.toUpperCase().split(''));
                
                let lossText = `❌ **You lost!** The word was **${word.toUpperCase()}**.`;
                if (diffConfig.fee > 0) lossText += `\nYou lost your **$${diffConfig.fee}** entry fee.`;

                await i.update({
                    embeds: [buildEmbed(state, diffConfig.maxReward, lossText)],
                    components: buildRows(state),
                });
                collector.stop('lost');
                return;
            }

            await i.update({ embeds: [buildEmbed(state, diffConfig.maxReward)], components: buildRows(state) });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'won' || reason === 'lost') return;
            if (state.finished) return;

            state.finished = true;
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [buildEmbed(state, diffConfig.maxReward, '⏱️ **Game timed out.** No reward was given and fees are lost.')],
                components: [],
            }).catch(() => {});
        });
    }, { command: 'hangman' })
};
