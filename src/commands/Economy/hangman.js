import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { addMoney } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MAX_WRONG = 5;
const REWARD = 100;
const GAME_TIME = 5 * 60 * 1000; // 5 minutes

const WORDS = [
    'apple', 'banana', 'guitar', 'planet', 'castle', 'dragon', 'forest',
    'wizard', 'rocket', 'bridge', 'jungle', 'puzzle', 'shadow', 'temple',
    'window', 'cactus', 'engine', 'garden', 'harbor', 'island', 'kitten',
    'lizard', 'mirror', 'needle', 'orange', 'pencil', 'quartz', 'ribbon',
    'sunset', 'turtle', 'violet', 'wallet', 'yogurt', 'zombie', 'anchor',
];

// ASCII gallows, indexed by number of wrong guesses (0..MAX_WRONG)
const HANGMAN_STAGES = [
`┌─────┐
│
│
│
│
│
┴──────`,
`┌─────┐
│     😵
│
│
│
│
┴──────`,
`┌─────┐
│     😵
│     |
│
│
│
┴──────`,
`┌─────┐
│     😵
│    /|
│
│
│
┴──────`,
`┌─────┐
│     😵
│    /|\\
│
│
│
┴──────`,
`┌─────┐
│     😵
│    /|\\
│    / \\
│
│
┴──────`,
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const PAGES = [
    [['A', 'B', 'C', 'D', 'E'], ['F', 'G', 'H', 'I', 'J'], ['K', 'L', 'M', 'N']],
    [['O', 'P', 'Q', 'R', 'S'], ['T', 'U', 'V', 'W', 'X'], ['Y', 'Z']],
];

function renderWord(word, guessed) {
    return word
        .toUpperCase()
        .split('')
        .map(ch => (guessed.has(ch) ? `\`${ch}\`` : '🔵'))
        .join(' ');
}

function buildEmbed(state, resultText = null) {
    const revealed = renderWord(state.word, state.guessed);
    const stage = HANGMAN_STAGES[state.wrong];

    const embed = createEmbed({
        title: `Hangman - ${state.wrong}/${MAX_WRONG}`,
        description: `\`\`\`\n${stage}\n\`\`\``,
        color: state.wrong >= MAX_WRONG ? '#E74C3C' : state.wrong >= 3 ? '#F39C12' : '#3498DB',
    }).addFields({ name: `Word (${state.word.length})`, value: revealed, inline: false });

    if (resultText) {
        embed.addFields({ name: '\u200b', value: resultText, inline: false });
    }

    embed.setFooter({ text: `Guess the word before the drawing is complete • Reward: $${REWARD}` });
    return embed;
}

function letterButton(letter, state) {
    const guessed = state.guessed.has(letter);
    const isCorrect = guessed && state.word.toUpperCase().includes(letter);

    const button = new ButtonBuilder()
        .setCustomId(`hangman_guess_${letter}`)
        .setLabel(letter)
        .setDisabled(guessed || state.finished);

    if (guessed) {
        button.setStyle(isCorrect ? ButtonStyle.Success : ButtonStyle.Danger);
    } else {
        button.setStyle(ButtonStyle.Primary);
    }

    return button;
}

function buildRows(state) {
    const pageLetters = PAGES[state.page];
    const rows = pageLetters.map(rowLetters =>
        new ActionRowBuilder().addComponents(rowLetters.map(l => letterButton(l, state)))
    );

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('hangman_nav')
            .setEmoji(state.page === 0 ? '▶️' : '◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(state.finished)
    );

    // Attach the nav button to the last row if there's room, otherwise its own row
    const lastRow = rows[rows.length - 1];
    if (lastRow.components.length < 5) {
        lastRow.addComponents(navRow.components[0]);
        return rows;
    }
    return [...rows, navRow];
}

export default {
    category: 'Economy',
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription(`Play hangman and win $${REWARD} if you guess the word`),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const word = WORDS[Math.floor(Math.random() * WORDS.length)];

        const state = {
            word,
            guessed: new Set(),
            wrong: 0,
            page: 0,
            finished: false,
        };

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [buildEmbed(state)],
            components: buildRows(state),
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: GAME_TIME,
        });

        collector.on('collect', async i => {
            if (i.customId === 'hangman_nav') {
                state.page = state.page === 0 ? 1 : 0;
                await i.update({ embeds: [buildEmbed(state)], components: buildRows(state) });
                return;
            }

            const letter = i.customId.replace('hangman_guess_', '');
            state.guessed.add(letter);

            if (!word.toUpperCase().includes(letter)) {
                state.wrong += 1;
            }

            const wordComplete = word
                .toUpperCase()
                .split('')
                .every(ch => state.guessed.has(ch));

            if (wordComplete) {
                state.finished = true;
                await addMoney(client, interaction.guildId, interaction.user.id, REWARD, 'wallet');
                await i.update({
                    embeds: [buildEmbed(state, `🎉 **You won!** The word was **${word.toUpperCase()}**.\nYou earned **$${REWARD}**!`)],
                    components: buildRows(state),
                });
                collector.stop('won');
                return;
            }

            if (state.wrong >= MAX_WRONG) {
                state.finished = true;
                state.guessed = new Set(word.toUpperCase().split(''));
                await i.update({
                    embeds: [buildEmbed(state, `💀 **You lost!** The word was **${word.toUpperCase()}**.\nYou earned **$0**.`)],
                    components: buildRows(state),
                });
                collector.stop('lost');
                return;
            }

            await i.update({ embeds: [buildEmbed(state)], components: buildRows(state) });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'won' || reason === 'lost') return;
            if (state.finished) return;

            state.finished = true;
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [buildEmbed(state, '⏱️ **Game timed out.** No reward was given.')],
                components: [],
            }).catch(() => {});
        });
    }, { command: 'hangman' })
};
