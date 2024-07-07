import { parseArgs, type ParseArgsConfig } from "node:util";
import { cleanContent } from "discord.js";

import type { CommandFunction } from "../types.js";

const argsConfig = {
    options: {
        channel: {
            type: "boolean",
            short: "c",
            default: false,
            multiple: false,
        },
    },
    allowPositionals: true,
} satisfies ParseArgsConfig;

/**
 * Creates a new poll (vote; yes/no)
 */
export const run: CommandFunction = async (message, args, context) => {
    const { values: options, positionals } = parseArgs({ ...argsConfig, args });

    if (positionals.length === 0) {
        return "Bruder da ist keine Frage :c";
    }

    const question = positionals.join(" ");
    if (question.length > 4096) {
        return "Bruder die Frage ist ja länger als mein Schwanz :c";
    }

    const embed = {
        description: `**${cleanContent(question, message.channel)}**`,
        timestamp: new Date().toISOString(),
        color: 0x9400d3,
        author: {
            name: `Umfrage von ${message.author.username}`,
            icon_url: message.author.displayAvatarURL(),
        },
    };

    const channel = options.channel ? context.textChannels.votes : message.channel;

    const messageWithVoteContent = await channel.send({
        embeds: [embed],
    });
    await Promise.all([messageWithVoteContent.react("👍"), messageWithVoteContent.react("👎")]);
    await message.delete();
};

export const description = `Erstellt eine Umfrage (ja/nein).
Usage: $COMMAND_PREFIX$vote [Optionen?] [Hier die Frage]
Optionen:
\t-c, --channel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen`;
