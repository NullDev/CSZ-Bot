import { SlashCommandBuilder } from "@discordjs/builders";
import { Client, CommandInteraction, Guild, MessageActionRow, MessageButton, MessageEmbedOptions } from "discord.js";
import fetch from "node-fetch";

import { ApplicationCommand, CommandResult, MessageCommand } from "./command.js";
import { GitHubContributor } from "../types.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { assertNever } from "../utils/typeUtils.js";

const buildMessageActionsRow = (): MessageActionRow[] => {
    return [
        new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setURL("https://github.com/NullDev/CSZ-Bot")
                    .setLabel("GitHub")
                    .setStyle("LINK")
                    .setDisabled(false))
    ];
};

const fetchContributions = async(): Promise<Array<GitHubContributor>> => {
    return fetch("https://api.github.com/repos/NullDev/CSZ-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" }
    }).then((res: any) => res.json());
};

const fetchLanguages = async(): Promise<Array<string>> => {
    const res = await fetch("https://api.github.com/repos/NullDev/CSZ-Bot/languages", {
        headers: { Accept: "application/vnd.github.v3+json" }
    });
    return Object.keys(await res.json() as {});
};

const getContributors = async(): Promise<string> => {
    const contributors = await fetchContributions();
    return contributors
        .filter(c => c.type === "User")
        .map(c => {
            const noBreakLogin = c.login.replace("-", "‑"); // Replace normal hyphen with no-breaking hypen
            return `[${noBreakLogin}](${c.html_url})`;
        }).join(", ");
};

const getTechStackInfo = async(): Promise<string> => {
    return `**Programmiersprache\n** ${(await fetchLanguages()).join(",")} \n` +
        `**NodeJS Version\n** ${process.version} \n`;
};

const getSystemInfo = (): string => {
    return `**PID\n** ${process.pid} \n` +
        `**Uptime\n** ${Math.floor(process.uptime())}s \n` +
        `**Platform\n** ${process.platform} \n` +
        `**System CPU usage time\n** ${process.cpuUsage().system} \n` +
        `**User CPU usage time\n** ${process.cpuUsage().user} \n` +
        `**Architecture\n** ${process.arch}`;
};

const getServerLevel = (guild: Guild) => {
    switch(guild.premiumTier) {
        case "NONE": return 0;
        case "TIER_1": return 1;
        case "TIER_2": return 2;
        case "TIER_3": return 3;
        default: return assertNever(guild.premiumTier);
    }
};

const getServerInfo = (guild: Guild): string => {
    // eslint-disable-next-line new-cap
    const birthday = Intl.DateTimeFormat("de-DE").format(guild.joinedTimestamp);
    const level = getServerLevel(guild);

    return `**Mitglieder\n** ${guild.memberCount} / ${guild.maximumMembers} \n` +
        `**Oberbabo\n** <@!${guild.ownerId}> \n` +
        `**Geburtstag\n** ${birthday} \n` +
        `**Boosts\n** ${guild.premiumSubscriptionCount} (Level: ${level}) \n` +
        "**Invite\n** https://discord.gg/csz";
};

const buildEmbed = async(guild: Guild | null, avatarUrl?: string): Promise<MessageEmbedOptions> => {
    const now = new Date();
    const embed = {
        color: 2007432,
        footer: {
            text: `${now.toDateString()} ${now.toLocaleTimeString()}`
        },
        author: {
            name: "Shitpost Bot",
            url: "https://discordapp.com/users/663146938811547660/",
            icon_url: avatarUrl
        },
        fields: [
            {
                name: "🪛 Contributors",
                value: await getContributors(),
                inline: false
            },
            {
                name: "🧬 Tech-Stack",
                value: await getTechStackInfo(),
                inline: true
            },
            {
                name: "⚙️ System",
                value: getSystemInfo(),
                inline: true
            }
        ]
    };

    if(!!guild){
        embed.fields.push({
            name: "👑 Server",
            value: getServerInfo(guild),
            inline: true
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
    async handleInteraction(command: CommandInteraction, client: Client): Promise<CommandResult> {
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
    async handleMessage(message: ProcessableMessage, client: Client): Promise<CommandResult> {
        const embed: MessageEmbedOptions = await buildEmbed(message.guild, client.user?.avatarURL() ?? undefined);

        const reply = message.reply({
            embeds: [embed]
        });
        const reaction = message.react("⚙️");
        await Promise.all([reply, reaction]);
    }
}
