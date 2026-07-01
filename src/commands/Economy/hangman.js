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
const GAME_TIME = 5 * 60 * 1000;
const COOLDOWN_TIME = 5 * 60 * 1000;
const easyCooldowns = new Collection();

const DIFFICULTIES = {
    easy: { name: 'Easy', fee: 0, minReward: 20, maxReward: 100, words: ['apple', 'cat', 'dog', 'sun', 'tree', 'book', 'fish', 'bird', 'cake', 'shoe', 'hat', 'milk', 'door', 'moon', 'star', 'rain'] },
    medium: { name: 'Medium', fee: 250, minReward: 500, maxReward: 1500, words: ['guitar', 'planet', 'castle', 'dragon', 'forest', 'wizard', 'rocket', 'bridge', 'jungle', 'puzzle', 'shadow', 'temple', 'window', 'cactus', 'engine', 'garden', 'harbor', 'island'] },
    hard: { name: 'Hard', fee: 1000, minReward: 2000, maxReward: 5000, words: ['quartz', 'zombie', 'yacht', 'rhythm', 'symphony', 'paradox', 'chrysanthemum', 'labyrinth', 'zephyr', 'kiosk', 'pharaoh', 'sphinx', 'mnemonic', 'pseudonym', 'xylophone', 'bourgeoisie'] }
};

const KEYBOARD_ROWS = [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'YZ']
];

function renderWord(word, guessed) {
    return word.toUpperCase().split('').map(ch => (guessed.has(ch) ? ch : '_')).join(' ');
}

function renderUI(wrongCount) {
    const totalLives = MAX_WRONG;
    const currentLives = totalLives - wrongCount;
    const bar = '█'.repeat(currentLives) + '░'.repeat(wrongCount);
    return `**STATUS:** ${currentLives === 0 ? '❌ FAILED' : '✅ ACTIVE'}\n**LIVES:** [${bar}] (${currentLives}/${totalLives})`;
}

function buildEmbed(state, reward, resultText = null) {
    const revealed = renderWord(state.word, state.guessed);
    const statusDisplay = renderUI(state.wrong);

    const embed = createEmbed({
        title: `🎮 Hangman :: ${state.difficultyName.toUpperCase()}`,
        description: `Use the buttons below to guess letters.\n\n${statusDisplay}`,
        color: state.wrong >= MAX_WRONG ? '#E74C3C' : '#FF69B4',
    })
    .addFields({ name: '『 CURRENT WORD 』', value: `> \`${revealed}\``, inline: false });

    if (resultText) {
        embed.addFields({ name: '『 GAME RESULT 』', value: resultText, inline: false });
    }

    embed.setFooter({ text: `Difficulty: ${state.difficultyName} | Fee: $${state.fee} | Prize: up to $${reward}` });
    return embed;
}

function letterButton(key, state) {
    const isYZ = key === 'YZ';
    const guessed = isYZ ? (state.guessed.has('Y') || state.guessed.has('Z')) : state.guessed.has(key);
    const isCorrect = isYZ ? (state.word.toUpperCase().includes('Y') || state.word.toUpperCase().includes('Z')) : state.word.toUpperCase().includes(key);

    return new ButtonBuilder()
        .setCustomId(`hangman_guess_${key}`)
        .setLabel(isYZ ? 'Y / Z' : key)
        .setDisabled(guessed || state.finished)
        .setStyle(guessed ? (isCorrect ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Primary);
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
        .addStringOption(option => option.setName('difficulty').setDescription('Select difficulty').setRequired(true)
            .addChoices(
                { name: 'Easy (Free, 5m cooldown)', value: 'easy' },
                { name: 'Medium ($250 fee)', value: 'medium' },
                { name: 'Hard ($1000 fee)', value: 'hard' }
            )),

    execute: withErrorHandling(async (interaction, config, client) => {
        const difficultyKey = interaction.options.getString('difficulty');
        const diffConfig = DIFFICULTIES[difficultyKey];
        const userId = interaction.user.id;

        if (difficultyKey === 'easy') {
            const lastPlayed = easyCooldowns.get(userId);
            if (lastPlayed && Date.now() - lastPlayed < COOLDOWN_TIME) {
                return interaction.reply({ content: `⏳ On cooldown. Try again in **${Math.ceil((COOLDOWN_TIME - (Date.now() - lastPlayed)) / 1000 / 60)} minutes**.`, ephemeral: true });
            }
        }

        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        if (diffConfig.fee > 0) {
            const ecoData = await getEconomyData(client, interaction.guildId, userId);
            if ((ecoData?.wallet || 0) < diffConfig.fee) return InteractionHelper.safeEditReply(interaction, { content: `❌ Need **$${diffConfig.fee}** to play.` });
            await removeMoney(client, interaction.guildId, userId, diffConfig.fee, 'wallet');
        }

        if (difficultyKey === 'easy') easyCooldowns.set(userId, Date.now());

        const state = {
            word: diffConfig.words[Math.floor(Math.random() * diffConfig.words.length)],
            guessed: new Set(),
            wrong: 0,
            finished: false,
            difficultyName: diffConfig.name,
            fee: diffConfig.fee
        };

        await InteractionHelper.safeEditReply(interaction, { embeds: [buildEmbed(state, diffConfig.maxReward)], components: buildRows(state) });

        const collector = (await interaction.fetchReply()).createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: GAME_TIME });

        collector.on('collect', async i => {
            const key = i.customId.replace('hangman_guess_', '');
            if (key === 'YZ') { state.guessed.add('Y'); state.guessed.add('Z'); } else { state.guessed.add(key); }
            
            if (!(key === 'YZ' ? (state.word.toUpperCase().includes('Y') || state.word.toUpperCase().includes('Z')) : state.word.toUpperCase().includes(key))) {
                state.wrong += 1;
            }

            if (state.word.toUpperCase().split('').every(ch => state.guessed.has(ch))) {
                state.finished = true;
                const reward = Math.floor(Math.random() * (diffConfig.maxReward - diffConfig.minReward + 1)) + diffConfig.minReward;
                await addMoney(client, interaction.guildId, userId, reward, 'wallet');
                await i.update({ embeds: [buildEmbed(state, diffConfig.maxReward, `🎉 **Won!** Word: ${state.word.toUpperCase()}\nReward: **$${reward}**`)], components: buildRows(state) });
                collector.stop('won');
            } else if (state.wrong >= MAX_WRONG) {
                state.finished = true;
                await i.update({ embeds: [buildEmbed(state, diffConfig.maxReward, `❌ **Lost!** Word: ${state.word.toUpperCase()}`)], components: buildRows(state) });
                collector.stop('lost');
            } else {
                await i.update({ embeds: [buildEmbed(state, diffConfig.maxReward)], components: buildRows(state) });
            }
        });
    }, { command: 'hangman' })
};
