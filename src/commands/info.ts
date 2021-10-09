import { Embed, SlashCommandBuilder } from '@discordjs/builders';
// @ts-ignore
import fetch from "node-fetch";
import { Client, CommandInteraction, Guild, Message, MessageActionRowOptions, MessageEmbedOptions } from "discord.js";
import { ApplicationCommand, MessageCommand } from './command';
import { GitHubContributor } from '../types';

/**
 * Info command. Displays some useless information about the bot.
 *
 * This command is both - a slash command (application command) and a message command
 */
export class InfoCommand implements ApplicationCommand, MessageCommand {
    modCommand: boolean = false;
    name = "info";
    description = "Listet Informationen über diesen Bot in einem Embed auf";

    public get applicationCommand(): SlashCommandBuilder {
        // Every Application command would have this structure at minimal. However
        // we don't enforce to use the name from the constructor, but highly encourage it
        // since the command handler is based on that.
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }

    /**
     * Replies to the interaction with the info embed as ephemeral reply
     * @param command interaction
     * @param client client
     * @returns info reply
     */
    async handleInteraction(command: CommandInteraction, client: Client): Promise<unknown> {
        const embed: MessageEmbedOptions = await buildEmbed(command.guild, client.user?.avatarURL() ?? undefined);
        return command.reply({
            embeds: [embed],
            ephemeral: true,
            components: buildMessageActionsRow()
        });
    }

    /**
     * Replies to the message with the info embed and reacts to the message
     * @param message message
     * @param client client
     * @returns reply and reaction
     */
    async handleMessage(message: Message, client: Client): Promise<unknown> {
        const embed: MessageEmbedOptions = await buildEmbed(message.guild, client.user?.avatarURL() ?? undefined);

        const reply = message.reply({
            embeds: [embed]
        });
        const reaction = message.react("⚙️");
        return Promise.all([reply, reaction]);
    }
}

const fetchContributions = async (): Promise<Array<GitHubContributor>> => {
    return fetch("https://api.github.com/repos/NullDev/CSC-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" }
    }).then((res: any) => res.json());
};

const buildEmbed = async(guild: Guild | null, avatarUrl?: string): Promise<MessageEmbedOptions> => {
    const contributors = await fetchContributions();

    let embed = {
        color: 2007432,
        footer: {
            text: `${new Date().toDateString()} ${new Date().toLocaleTimeString()}`
        },
        author: {
            name: "Shitpost Bot",
            url: "https://discordapp.com/users/663146938811547660/",
            icon_url: avatarUrl
        },
        fields: [
            {
                name: "🪛 Contributors",
                value: buildAsciiChart(contributors),
                inline: false
            },
            {
                name: "🧬 Tech-Stack",
                value: getTechStackInfo(),
                inline: true
            },
            {
                name: "⚙️ System",
                value: getSystemInfo(),
                inline: true
            }
        ]
    };

    if(guild != null) {
        embed.fields.push({
            name: "👑 Server",
            value: getServerInfo(guild),
            inline: true
        })
    }

    return embed;
};

const buildMessageActionsRow = (): MessageActionRowOptions[] => {
    return [
        {
            type: 1,
            components: [
                {
                    style: 5,
                    label: "GitHub",
                    url: "https://github.com/repos/NullDev/CSC-Bot",
                    disabled: false,
                    type: "BUTTON"
                }
            ]
        }
    ];
};

const buildAsciiChart = (contributors: Array<GitHubContributor>): string => {
    const max = Math.max(...contributors.map(c => c.contributions));
    const maxLength = max.toString().length;
    const fractions = ['▏', '▎', '▍', '▋', '▊', '▉'];

    return contributors
        .filter(c => c.type === "User")
        .map(c => {
            const length = c.contributions * 25 / max;
            const wholeNumberPart = Math.floor(length);
            const fractionalPart = length - wholeNumberPart;
            const contributions = c.contributions;

            let bar = fractions[fractions.length - 1].repeat(wholeNumberPart);
            if (fractionalPart > 0) {
                bar += fractions[Math.floor(fractionalPart * fractions.length)];
            }
            return `\`${rjust(contributions.toString(), maxLength)}\` ${bar} [${c.login}](${c.html_url})`;
        }).join("\n");
}


const rjust = (s: string, max: number) => {
    return " ".repeat(max - s.length) + s;
};

const getTechStackInfo = (): string => {
    return "**Programmiersprache\n** NodeJS \n" +
        `**NodeJS Version\n** ${process.version} \n`
};

const getSystemInfo = (): string => {
    return `**PID\n** ${process.pid} \n` +
        `**Uptime\n** ${Math.floor(process.uptime())}s \n` +
        `**Platform\n** ${process.platform} \n` +
        `**System CPU usage time\n** ${process.cpuUsage().system} \n` +
        `**User CPU usage time\n** ${process.cpuUsage().user} \n` +
        `**Architecture\n** ${process.arch}`
}

const getServerInfo = (guild: Guild): string => {
    const birthday = Intl.DateTimeFormat("de-DE").format(guild.joinedTimestamp);
    let level = 0;

    switch(guild.premiumTier) {
        case "TIER_1":
            level = 1;
            break;
        case "TIER_2":
            level = 2;
            break;
        case "TIER_3":
            level = 3;
            break;
        default:
            break;
    }

    return `**Mitglieder\n** ${guild.memberCount} / ${guild.maximumMembers} \n` +
        `**Oberbabo\n** <@!${guild.ownerId}> \n` +
        `**Geburtstag\n** ${birthday} \n` +
        `**Boosts\n** ${guild.premiumSubscriptionCount} (Level: ${level}) \n` +
        "**Invite\n** https://discord.gg/csz";
}
