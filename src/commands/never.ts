import {
    type CacheType,
    type CommandInteraction,
    type Message,
    EmbedBuilder,
    type GuildMember,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";

import type { ApplicationCommand, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { BotContext } from "../context.js";

type Prompt = string;

interface NeverPrompt {
    prompt: Prompt;
    level?: number;
}

const NEVER_EVER_RANDOM_PROMPT_API_URL =
    "https://thepartyapp.xyz/api/games/neverever/getRandomPrompt";
const QUESTION_LEVEL_EMOJI_MAP: Record<number, string> = {
    0: "👶",
    1: "🍆",
    2: "🍆",
};

async function getPrompt(userPrompt: Prompt | null): Promise<NeverPrompt> {
    if (userPrompt !== null && userPrompt.length > 0) {
        return {
            prompt: userPrompt,
            level: undefined,
        };
    }

    // hint to future developers: you can pass a filter query param where
    // 0 = kids, 1 = 18+
    // by default (undefined) it is not filtering and gives you *any* prompt
    const promptResponse = await fetch(NEVER_EVER_RANDOM_PROMPT_API_URL, {
        method: "GET",
    });
    return promptResponse.json() as unknown as NeverPrompt;
}

function buildEmbed(prompt: NeverPrompt, author: GuildMember) {
    const emoji =
        prompt.level !== undefined
            ? QUESTION_LEVEL_EMOJI_MAP[prompt.level]
            : "👀";
    return new EmbedBuilder()
        .setTitle(prompt.prompt)
        .setColor(0x2ecc71)
        .setAuthor({
            name: `${author.displayName} ${emoji}`,
            iconURL: author.displayAvatarURL(),
        })
        .setFooter({
            text: "🍻: Hab ich schon, 🚱: Hab ich noch nie",
        });
}

export class NeverCommand implements ApplicationCommand, MessageCommand {
    name = "never";
    description = 'Stellt eine "ich hab noch nie" Frage';
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("prompt")
                .setDescription("Wat haste denn noch nie?")
                .setRequired(false),
        );

    async handleInteraction(command: CommandInteraction<CacheType>) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const author = command.guild?.members.resolve(command.user);
        const customInput = command.options.getString("prompt", false) || null;

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const prompt = await getPrompt(customInput);
        const embed = buildEmbed(prompt, author);
        const sentReply = await command.reply({
            fetchReply: true,
            embeds: [embed],
        });
        const sentMessage = sentReply as Message<boolean>;
        await Promise.all([sentMessage.react("🍻"), sentMessage.react("🚱")]);
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const { channel } = message;
        const author = message.guild?.members.resolve(message.author);
        const customInput = message.content.slice(
            `${context.prefix.command}mock `.length,
        );

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const prompt = await getPrompt(customInput);
        const embed = buildEmbed(prompt, author);
        const sentMessage = await channel.send({
            embeds: [embed],
        });
        await Promise.all([sentMessage.react("🍻"), sentMessage.react("🚱")]);
    }
}
