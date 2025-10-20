import {
    ActionRowBuilder,
    type APIEmbedField,
    ComponentType,
    EmbedBuilder,
    type GuildTextBasedChannel,
    type Message,
    StringSelectMenuBuilder,
} from "discord.js";

import type { MessageCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import type { ProcessableMessage } from "@/service/command.js";

import { parseLegacyMessageParts } from "@/service/command.js";
import { LETTERS, EMOJI } from "@/service/poll.js";
import * as pollService from "@/service/poll.js";
import { defer } from "@/utils/interactionUtils.js";
import * as poll from "./poll.js";

const isPollField = (field: APIEmbedField): boolean =>
    !field.inline && LETTERS.some(l => field.name.startsWith(l));

type ResolvedPoll = {
    message: Message;
    description: string;
};

async function fetchPollsFromChannel(
    channel: GuildTextBasedChannel,
    context: BotContext,
): Promise<ResolvedPoll[]> {
    const messagesFromBot = channel.messages.cache
        .values()
        .filter(m => m.author.id === context.client.user.id);
    const polls = messagesFromBot
        .filter(m => m.embeds.length === 1)
        .filter(m => m.embeds[0].color === 0x2ecc71) // green color => extendable
        .filter(
            m =>
                m.embeds[0].author?.name.startsWith("Umfrage") ||
                m.embeds[0].author?.name.startsWith("Strawpoll"),
        );

    return Array.from(polls)
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
        .map(m => {
            let description = m.embeds[0].description || "";
            // Remove leading and trailing double asterisks if present
            if (description.startsWith("**") && description.endsWith("**")) {
                description = description.slice(2, -2);
            }
            return {
                message: m,
                description,
            } as ResolvedPoll;
        });
}

export default class ExtendCommand implements MessageCommand {
    name = "extend";
    description = `Nutzbar als Reply auf eine mit --extendable erstellte Umfrage, um eine/mehrere Antwortmöglichkeit/en hinzuzufügen. Die Anzahl der bestehenden und neuen Antwortmöglichkeiten darf ${poll.OPTION_LIMIT} nicht übersteigen.\nUsage: $COMMAND_PREFIX$extend [Antwort 1] ; [...]`;

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);
        const response = await this.legacyHandler(message, context, args);
        if (response) {
            await message.channel.send(response);
        }
    }

    async #offerPollSelection(
        extendMessage: Message<true>,
        polls: readonly ResolvedPoll[],
    ): Promise<Message<true> | undefined> {
        const pollSelectOption = new StringSelectMenuBuilder()
            .setCustomId("extend-poll-select")
            .setPlaceholder("Wähle eine Umfrage aus")
            .addOptions(
                polls
                    .slice(0, 24) // Discord allows max. 25 options
                    .map(poll => ({
                        label:
                            poll.description.length > 100
                                ? `${poll.description.slice(0, 97)}…`
                                : poll.description || "Kein Titel",
                        value: poll.message.id,
                    })),
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(pollSelectOption);

        const promptMessage = await extendMessage.channel.send({
            content: "Bruder, auf welche Umfrage willst du antworten?",
            components: [row],
        });

        await using _ = defer(() => promptMessage.delete());

        try {
            const interaction = await promptMessage.awaitMessageComponent({
                filter: i =>
                    i.user.id === extendMessage.author.id && i.customId === "extend-poll-select",
                componentType: ComponentType.StringSelect,
                time: 60000,
            });

            await interaction.deferUpdate();

            return await extendMessage.channel.messages.fetch(interaction.values[0]);
        } catch {
            // interaction timeout
            return undefined;
        }
    }

    async legacyHandler(message: ProcessableMessage, context: BotContext, args: string[]) {
        if (!args.length) {
            return "Bruder da sind keine Antwortmöglichkeiten :c";
        }

        let pollMessage = message.reference?.messageId
            ? await message.channel.messages.fetch(message.reference.messageId)
            : undefined;

        if (!pollMessage) {
            const polls = await fetchPollsFromChannel(message.channel, context);
            if (polls.length === 0) {
                return "Bruder ich konnte echt keine Umfrage finden, welche du erweitern könntest. Sieh zu, dass du die Reply-Funktion benutzt oder den richtigen Channel auswählst.";
            }
            pollMessage ??= await this.#offerPollSelection(message, polls);
        }

        if (!pollMessage) {
            return "Bruder ich konnte echt keine Umfrage finden, welche du erweitern könntest. Sieh zu, dass du die Reply-Funktion benutzt oder den richtigen Channel auswählst.";
        }

        if (pollMessage.guildId !== context.guild.id) {
            return "Bruder bleib mal hier auf'm Server.";
        }

        const dbPoll = await pollService.findPollForEmbedMessage(pollMessage);
        if (!dbPoll) {
            return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
        }

        if (!pollMessage.editable) {
            return "Bruder aus irgrndeinem Grund hat der Bot verkackt und kann die Umfrage nicht bearbeiten :<";
        }

        if (!dbPoll.extendable) {
            return "Bruder die Umfrage ist nicht erweiterbar (ง'̀-'́)ง";
        }

        const oldPollOptionFields = pollMessage.embeds[0].fields.filter(field =>
            isPollField(field),
        );

        if (oldPollOptionFields.length === poll.OPTION_LIMIT) {
            return "Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)";
        }

        const additionalPollOptions = args
            .join(" ")
            .split(";")
            .map(e => e.trim())
            .filter(e => e.replace(/\s/g, "") !== "");

        if (!additionalPollOptions.length) {
            return "Bruder da sind keine Antwortmöglichkeiten :c";
        }

        if (additionalPollOptions.length + oldPollOptionFields.length > poll.OPTION_LIMIT) {
            return `Bruder mit deinen Antwortmöglichkeiten wird das Limit von ${poll.OPTION_LIMIT} überschritten!`;
        }

        if (additionalPollOptions.some(value => value.length > poll.FIELD_VALUE_LIMIT)) {
            return `Bruder mindestens eine Antwortmöglichkeit ist länger als ${poll.FIELD_VALUE_LIMIT} Zeichen!`;
        }

        const replyEmbed = pollMessage.embeds[0];
        const originalAuthor = replyEmbed.author?.name.split(" ").slice(2).join(" ");
        const author = originalAuthor === message.author.username ? undefined : message.author;

        const newFields = additionalPollOptions.map((value, i) =>
            poll.createOptionField(value, oldPollOptionFields.length + i, author),
        );

        let metaFields = pollMessage.embeds[0].fields.filter(field => !isPollField(field));
        const embed = EmbedBuilder.from(pollMessage.embeds[0]).data;

        if (oldPollOptionFields.length + additionalPollOptions.length === poll.OPTION_LIMIT) {
            embed.color = 0xcd5c5c;
            metaFields = metaFields.filter(field => !field.name.endsWith("Erweiterbar"));
        }

        embed.fields = [...oldPollOptionFields, ...newFields, ...metaFields];

        const msg = await pollMessage.edit({
            embeds: [embed],
            // Re-Applying embed thumbnails from attachments will post a picture,
            // therefore we keep attachments empty.
            attachments: [],
        });

        for (const i in additionalPollOptions) {
            await msg.react(EMOJI[oldPollOptionFields.length + Number(i)]);
        }
        await message.delete();
    }
}
