import { ActionRowBuilder, ComponentType, type Message, StringSelectMenuBuilder } from "discord.js";

import type { MessageCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import type { ProcessableMessage } from "@/service/command.js";
import type { Poll } from "@/storage/db/model.js";

import * as pollEmbedService from "@/service/pollEmbed.js";
import { parseLegacyMessageParts } from "@/service/command.js";
import * as pollService from "@/service/poll.js";
import { defer } from "@/utils/interactionUtils.js";
import { truncateToLength } from "@/utils/stringUtils.js";

export default class ExtendCommand implements MessageCommand {
    name = "extend";
    description = `Nutzbar als Reply auf eine mit --extendable erstellte Umfrage, um eine/mehrere Antwortmöglichkeit/en hinzuzufügen. Die Anzahl der bestehenden und neuen Antwortmöglichkeiten darf ${pollEmbedService.OPTION_LIMIT} nicht übersteigen.\nUsage: $COMMAND_PREFIX$extend [Antwort 1] ; [...]`;

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);
        const response = await this.legacyHandler(message, context, args);
        if (response) {
            await message.channel.send(response);
        }
    }

    async #offerPollSelection(
        extendMessage: Message<true>,
        polls: readonly Poll[],
    ): Promise<Message<true> | undefined> {
        const pollSelectOption = new StringSelectMenuBuilder()
            .setCustomId("extend-poll-select")
            .setPlaceholder("Wähle eine Umfrage aus")
            .addOptions(
                polls
                    .slice(0, 24) // Discord allows max. 25 options
                    .map(poll => ({
                        label: truncateToLength(poll.question, 100) || "Kein Titel",
                        value: poll.embedMessageId,
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
            const polls = await pollService.findExtendablePollsInChannel(message.channel);
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

        if (!pollMessage.editable) {
            return "Bruder aus irgrndeinem Grund hat der Bot verkackt und kann die Umfrage nicht bearbeiten :<";
        }

        const dbPoll = await pollService.findPollForEmbedMessage(pollMessage);
        if (!dbPoll) {
            return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
        }

        if (!dbPoll.extendable) {
            return "Bruder die Umfrage ist nicht erweiterbar (ง'̀-'́)ง";
        }

        if (dbPoll.options.length === pollEmbedService.OPTION_LIMIT) {
            return "Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)";
        }

        const additionalPollOptions = pollService.parsePollOptionString(args.join(" "));
        if (!additionalPollOptions.length) {
            return "Bruder da sind keine Antwortmöglichkeiten :c";
        }

        if (additionalPollOptions.length + dbPoll.options.length > pollEmbedService.OPTION_LIMIT) {
            return `Bruder mit deinen Antwortmöglichkeiten wird das Limit von ${pollEmbedService.OPTION_LIMIT} überschritten!`;
        }

        if (
            additionalPollOptions.some(value => value.length > pollEmbedService.FIELD_VALUE_LIMIT)
        ) {
            return `Bruder mindestens eine Antwortmöglichkeit ist länger als ${pollEmbedService.FIELD_VALUE_LIMIT} Zeichen!`;
        }

        for (const option of additionalPollOptions) {
            await pollService.addPollOption(message.author, dbPoll, option);
        }

        const newPoll = await pollService.findPoll(dbPoll.id);
        if (newPoll === undefined) {
            throw new Error("Could not find poll that should have been there.");
        }

        const pollAuthor = (await message.guild.members.fetch(newPoll.authorId))?.user ?? {
            username: "<unbekannt>",
            iconURL: undefined,
        };

        const embed = pollEmbedService.buildPollEmbed(
            message.channel,
            {
                question: newPoll.question,
                anonymous: newPoll.anonymous,
                extendable: newPoll.extendable,
                ended: newPoll.ended,
                endsAt: newPoll.endsAt ? new Date(newPoll.endsAt) : null,
                multipleChoices: newPoll.multipleChoices,
                author: pollAuthor,
            },
            newPoll.options.map(o => ({
                index: o.index,
                option: o.option,
                author: message.guild.members.cache.get(o.authorId)?.user,
            })),
        );

        const msg = await pollMessage.edit({
            embeds: [embed],
            // Re-Applying embed thumbnails from attachments will post a picture,
            // therefore we keep attachments empty.
            attachments: [],
        });

        for (const i in additionalPollOptions) {
            await msg.react(pollEmbedService.EMOJI[dbPoll.options.length + Number(i)]);
        }
        await message.delete();
    }
}
