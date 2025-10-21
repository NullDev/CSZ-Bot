import {
    type APIEmbed,
    type APIEmbedField,
    cleanContent,
    EmbedBuilder,
    type TextBasedChannel,
    time,
    TimestampStyles,
    type User,
} from "discord.js";

import * as pollService from "@/service/poll.js";

export const TEXT_LIMIT = 4096;
export const FIELD_NAME_LIMIT = 256;
export const FIELD_VALUE_LIMIT = 1024;
export const POLL_OPTION_SEPARATOR = " - ";
export const POLL_OPTION_MAX_LENGTH =
    2 * FIELD_VALUE_LIMIT -
    Math.max(...pollService.LETTERS.map(s => s.length)) -
    POLL_OPTION_SEPARATOR.length;
export const OPTION_LIMIT = pollService.LETTERS.length;

export type AuthorSpec = { username: string; iconURL?: string };

export type PollEmbedParameters = {
    author: AuthorSpec;
    question: string;
    multipleChoices: boolean;
    anonymous: boolean;
    extendable: boolean;
    endsAt: Date | null;
    ended: boolean;
};

export type PollEmbedOptionParameters = {
    index: number;
    option: string;
    /** if not present, will be "unknown author". NOT used to show/hide the author */
    author: AuthorSpec | undefined;
};

export function buildPollEmbed(
    targetChannel: TextBasedChannel,
    poll: PollEmbedParameters,
    options: readonly PollEmbedOptionParameters[],
): APIEmbed {
    const embed = new EmbedBuilder({
        description: `**${cleanContent(poll.question, targetChannel)}**`,
        fields: options.map(o =>
            createOptionField(
                o.option,
                o.index,
                o.author,
                o.author?.username !== poll.author.username,
            ),
        ),
        timestamp: new Date().toISOString(),
        author: {
            name: `${poll.multipleChoices ? "Umfrage" : "Strawpoll"} von ${poll.author}`,
            icon_url: poll.author.iconURL,
        },
        thumbnail: {
            url: "attachment://question.png",
        },
    });

    if (poll.extendable) {
        if (poll.endsAt !== null) {
            throw new Error("A poll with delay cannot be extended");
        }

        embed.addFields({
            name: "✏️ Erweiterbar",
            value: "mit .extend als Reply",
            inline: true,
        });
        embed.setColor(0x2ecc71);
    }

    if (poll.endsAt !== null) {
        embed.addFields({
            name: "⏳ Verzögert",
            value: `Abstimmungsende: ${time(new Date(poll.endsAt), TimestampStyles.RelativeTime)}`,
            inline: true,
        });
        embed.setColor(0xa10083);
    }

    embed.addFields({
        name: `📝 ${poll.multipleChoices ? "Mehrfachauswahl" : "Einzelauswahl"}`,
        value: "\u200b", // Zero-width space because there has to be some value
        inline: true,
    });

    return embed.data;
}

function createOptionField(
    option: string,
    index: number,
    author: AuthorSpec | undefined,
    showAuthor: boolean,
): APIEmbedField {
    let newOption = option;
    if (showAuthor) {
        newOption += author ? ` (von ${author.username})` : " (Author nicht gefunden)";

        if (newOption.length > POLL_OPTION_MAX_LENGTH) {
            throw new Error(
                `Alter jetzt mal ganz im ernst, du hast etwas weniger als ${POLL_OPTION_MAX_LENGTH} Zeichen zur Verfüngung. Ich brauch auch noch ein bisschen Platz. Kannst du doch nicht ernst meinen.`,
            );
        }
    }

    const optionDiscriminator = `${pollService.LETTERS[index]}${POLL_OPTION_SEPARATOR}`;
    const splitIndex = FIELD_NAME_LIMIT - optionDiscriminator.length;
    const firstTextBlock = optionDiscriminator + newOption.substring(0, splitIndex);
    const secondTextBlock = newOption.substring(splitIndex) || " ";

    return { name: firstTextBlock, value: secondTextBlock, inline: false };
}

export type PollOption = {
    letter: string;
    content: string;
    chosenBy: User[];
};

export function buildDelayedPollResultEmbed(
    author: { name: string; iconURL?: string },
    question: string,
    options: PollOption[],
): APIEmbed {
    const totalReactions = Math.sumPrecise(options.map(o => o.chosenBy.length));
    return {
        description: `Zusammenfassung: ${question}`,
        fields: options.map(option => ({
            name: `${option.letter} ${option.content} (${option.chosenBy.length})`,
            value: option.chosenBy.map(user => user.toString()).join("\n") || "-",
            inline: false,
        })),
        timestamp: new Date().toISOString(),
        author: {
            name: author.name,
            icon_url: author.iconURL,
        },
        footer: {
            text: `Gesamtabstimmungen: ${totalReactions}`,
        },
    };
}
