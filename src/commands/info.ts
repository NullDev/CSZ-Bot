import {
    type CommandInteraction,
    type Guild,
    GuildPremiumTier,
    type APIEmbed,
    ButtonStyle,
    SlashCommandBuilder,
    ComponentType,
} from "discord.js";

import type { ApplicationCommand, MessageCommand } from "./command.js";
import type { GitHubContributor } from "../types.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { assertNever } from "../utils/typeUtils.js";
import type { BotContext } from "src/context.js";

const fetchContributions = async (): Promise<Array<GitHubContributor>> => {
    return fetch("https://api.github.com/repos/NullDev/CSZ-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" },
    }).then(res => res.json() as Promise<Array<GitHubContributor>>);
};

const fetchLanguages = async (): Promise<Array<string>> => {
    const res = await fetch(
        "https://api.github.com/repos/NullDev/CSZ-Bot/languages",
        {
            headers: { Accept: "application/vnd.github.v3+json" },
        },
    );
    return Object.keys((await res.json()) as object);
};

const getContributors = async (): Promise<string> => {
    const contributors = await fetchContributions();
    return `${contributors
        .filter(c => c.type === "User")
        .map(c => {
            return c.login.replace("-", "‑"); // Replace normal hyphen with no-breaking hypen
        })
        .join(
            ", ",
        )} | [[Auf GitHub ansehen]](https://github.com/NullDev/CSZ-Bot/graphs/contributors)`;
};

const getTechStackInfo = async (): Promise<string> => {
    return (
        `**Programmiersprache\n** ${(await fetchLanguages()).join(",")} \n` +
        `**NodeJS Version\n** ${process.version} \n`
    );
};

const getSystemInfo = (): string => {
    return (
        `**PID\n** ${process.pid} \n` +
        `**Uptime\n** ${Math.floor(process.uptime())}s \n` +
        `**Platform\n** ${process.platform} \n` +
        `**System CPU usage time\n** ${process.cpuUsage().system} \n` +
        `**User CPU usage time\n** ${process.cpuUsage().user} \n` +
        `**Architecture\n** ${process.arch}`
    );
};

const getServerLevel = (guild: Guild) => {
    switch (guild.premiumTier) {
        case GuildPremiumTier.None:
            return 0;
        case GuildPremiumTier.Tier1:
            return 1;
        case GuildPremiumTier.Tier2:
            return 2;
        case GuildPremiumTier.Tier3:
            return 3;
        default:
            return assertNever(guild.premiumTier);
    }
};

const getServerInfo = (guild: Guild): string => {
    const birthday = Intl.DateTimeFormat("de-DE").format(guild.joinedTimestamp);
    const level = getServerLevel(guild);

    return (
        // biome-ignore lint/style/useTemplate: Better readability
        `**Mitglieder\n** ${guild.memberCount} / ${guild.maximumMembers} \n` +
        `**Oberbabo\n** <@!${guild.ownerId}> \n` +
        `**Geburtstag\n** ${birthday} \n` +
        `**Boosts\n** ${guild.premiumSubscriptionCount} (Level: ${level}) \n` +
        "**Invite\n** https://discord.gg/csz"
    );
};

const buildEmbed = async (
    guild: Guild | null,
    avatarUrl?: string,
): Promise<APIEmbed> => {
    const now = new Date();
    const embed = {
        color: 0x1ea188,
        footer: {
            text: `${now.toDateString()} ${now.toLocaleTimeString()}`,
        },
        author: {
            name: "Shitpost Bot",
            url: "https://discordapp.com/users/663146938811547660/",
            icon_url: avatarUrl,
        },
        fields: [
            {
                name: "🪛 Contributors",
                value: await getContributors(),
                inline: false,
            },
            {
                name: "🧬 Tech-Stack",
                value: await getTechStackInfo(),
                inline: true,
            },
            {
                name: "⚙️ System",
                value: getSystemInfo(),
                inline: true,
            },
        ],
    };

    if (guild) {
        embed.fields.push({
            name: "👑 Server",
            value: getServerInfo(guild),
            inline: true,
        });
    }

    return embed;
};

/**
 * Info command. Displays some useless information about the bot.
 *
 * This command is both - a slash command (application command) and a message command
 */
export class InfoCommand implements ApplicationCommand, MessageCommand {
    modCommand = false;
    name = "info";
    description = "Listet Informationen über diesen Bot in einem Embed auf";

    // Every Application command would have this structure at minimal. However
    // we don't enforce to use the name from the constructor, but highly encourage it
    // since the command handler is based on that.
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    /**
     * Replies to the interaction with the info embed as ephemeral reply
     * @param command interaction
     * @param client client
     * @returns info reply
     */
    async handleInteraction(command: CommandInteraction, context: BotContext) {
        const embed = await buildEmbed(
            command.guild,
            context.client.user.avatarURL() ?? undefined,
        );
        await command.reply({
            embeds: [embed],
            ephemeral: true,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            url: "https://github.com/NullDev/CSZ-Bot",
                            label: "GitHub",
                            style: ButtonStyle.Link,
                            disabled: false,
                        },
                    ],
                },
            ],
        });
    }

    /**
     * Replies to the message with the info embed and reacts to the message
     * @param message message
     * @param client client
     * @returns reply and reaction
     */
    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const embed = await buildEmbed(
            message.guild,
            context.client.user.avatarURL() ?? undefined,
        );

        const reply = message.reply({
            embeds: [embed],
        });
        const reaction = message.react("⚙️");
        await Promise.all([reply, reaction]);
    }
}
