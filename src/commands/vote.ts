import { parseArgs, type ParseArgsConfig } from "node:util";

import { cleanContent } from "discord.js";

import type { MessageCommand } from "./command.js";
import type { BotContext } from "@/context.js";
import type { ProcessableMessage } from "../service/command.js";

import { parseLegacyMessageParts } from "../service/command.js";

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

export default class VoteCommand implements MessageCommand {
    name = "vote";
    description = `Erstellt eine Umfrage (ja/nein).
Usage: $COMMAND_PREFIX$vote [Optionen?] [Hier die Frage]
Optionen:
\t-c, --channel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen`;

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);

        let params: ReturnType<typeof parseArgs>;
        try {
            params = parseArgs({ ...argsConfig, args });
        } catch {
            await message.channel.send("Yo da stimmte was mit den parametern nicht");
            return;
        }
        const { values: options, positionals } = params;

        if (positionals.length === 0) {
            await message.channel.send("Bruder da ist keine Frage :c");
            return;
        }

        const question = positionals.join(" ");
        if (question.length > 4096) {
            await message.channel.send("Bruder die Frage ist ja länger als mein Schwanz :c");
            return;
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
    }
}
