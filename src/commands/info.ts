import { Embed, SlashCommandBuilder } from '@discordjs/builders';
// @ts-ignore
import fetch from "node-fetch";
import { Client, CommandInteraction, Message, MessageEmbedOptions } from "discord.js";
import { AbstractCommand, ApplicationCommand, MessageCommand } from './command';

/**
 * Info command. Displays some useless information about the bot.
 *
 * This command is both - a slash command (application command) and a message command
 */
export class InfoCommand extends AbstractCommand implements ApplicationCommand, MessageCommand {
    modCommand: boolean = false;

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
        const embed: MessageEmbedOptions = await buildEmbed(client.user?.avatarURL() ?? undefined);
        return command.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /**
     * Replies to the message with the info embed and reacts to the message
     * @param message message
     * @param client client
     * @returns reply and reaction
     */
    async handleMessage(message: Message, client: Client): Promise<unknown> {
        const embed: MessageEmbedOptions = await buildEmbed(client.user?.avatarURL() ?? undefined);

        const reply = message.reply({
            embeds: [embed]
        });
        const reaction = message.react("⚙️");
        return Promise.all([reply, reaction]);
    }
}

interface Contributors {
    type: string,
    html_url: string,
    contributions: number
};

const fetchContributions = async (): Promise<Array<Contributors>> => {
    return fetch("https://api.github.com/repos/NullDev/CSC-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" }
    }).then((res: any) => res.json());
};

const formatContributors = (contributors: Array<Contributors>): string => {
    return contributors
        .filter(e => e.type === "User")
        .map(e => `<${e.html_url}> (Contributions: ${e.contributions})`)
        .join("\n");
};

const buildEmbed = async(avatarUrl?: string): Promise<MessageEmbedOptions> => {
    const contributors = await fetchContributions();
    const formattedContributors = formatContributors(contributors);

    return {
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
                name: "⚙️ Eckdaten",
                value: "**Programmiersprache:** NodeJS \n" +
                    `**NodeJS Version:** ${process.version} \n` +
                    `**PID:** ${process.pid} \n` +
                    `**Uptime:** ${Math.floor(process.uptime())}s \n` +
                    `**Platform:** ${process.platform} \n` +
                    `**System CPU usage time:** ${process.cpuUsage().system} \n` +
                    `**User CPU usage time:** ${process.cpuUsage().user} \n` +
                    `**Architecture:** ${process.arch}`,
                inline: true
            },
            {
                name: "🔗 Source Code",
                value: "**Link:** https://github.com/NullDev/CSC-Bot ",
                inline: true
            },
            {
                name: "🪛 Contributors",
                value: `${formattedContributors}`,
                inline: false
            }
        ]
    };
};
