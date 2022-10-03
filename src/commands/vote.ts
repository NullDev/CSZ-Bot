import parseOptions from "minimist";
import { cleanContent } from "discord.js";

import { getConfig } from "../utils/configHandler.js";
import type { CommandFunction } from "../types.js";

const config = getConfig();

/**
 * Creates a new poll (vote; yes/no)
 */
export const run: CommandFunction = async(_client, message, args, context) => {
    const options = parseOptions(args, {
        "boolean": [
            "channel"
        ],
        alias: {
            channel: "c"
        }
    });

    const parsedArgs = options._;

    if (!parsedArgs.length) return "Bruder da ist keine Frage :c";

    const embed = {
        title: `**${cleanContent(parsedArgs.join(" "), message.channel)}**`,
        timestamp: new Date().toISOString(),
        color: 0x9400D3,
        author: {
            name: `Umfrage von ${message.author.username}`,
            icon_url: message.author.displayAvatarURL()
        }
    };

    const channel = options.channel
        ? context.textChannels.votes
        : message.channel;

    const messageWithVoteContent = await channel.send( {
        embeds: [embed]
    });
    await Promise.all([
        messageWithVoteContent.react("👍"),
        messageWithVoteContent.react("👎")
    ]);
    await message.delete();
};

export const description = `Erstellt eine Umfrage (ja/nein).
Usage: ${config.bot_settings.prefix.command_prefix}vote [Optionen?] [Hier die Frage]
Optionen:
\t-c, --channel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen`;
