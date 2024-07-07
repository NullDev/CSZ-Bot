import {
    type CommandInteraction,
    type PermissionsString,
    SlashCommandBuilder,
    SlashCommandIntegerOption,
    SlashCommandStringOption,
    SlashCommandUserOption,
} from "discord.js";

import type { ApplicationCommand, MessageCommand } from "../command.js";
import type { ProcessableMessage } from "../../service/commandService.js";
import type { BotContext } from "../../context.js";

import * as banService from "../../service/banService.js";
import { formatDuration } from "../../utils/dateUtils.js";

export default class BanCommand implements ApplicationCommand, MessageCommand {
    name = "ban";
    description = "Joa, bannt halt einen ne?";
    requiredPermissions: readonly PermissionsString[] = ["BanMembers"];

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(0)
        .addUserOption(
            new SlashCommandUserOption()
                .setRequired(true)
                .setName("user")
                .setDescription("Der, der gebannt werden soll"),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("reason")
                .setDescription("Warum er es verdient hat"),
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
                .setRequired(false)
                .setName("hours")
                .setDescription("Wie lange in Stunden"),
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
                .setRequired(false)
                .setName("minutes")
                .setDescription("Wie lange in Minuten"),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const user = command.options.getUser("user", true);
        const invokingUser = command.user;
        const reason = command.options.getString("reason", true);
        const durationHours = command.options.getInteger("hours", false);
        const durationMinutes = command.options.getInteger("minutes", false);
        const duration =
            (durationHours ? durationHours : 0) + (durationMinutes ? durationMinutes / 60 : 0);

        const userAsGuildMember = command.guild?.members.resolve(user);
        if (!userAsGuildMember) {
            await command.reply({
                content: "Yo, der ist nicht auf dem Server",
                ephemeral: true,
            });
            return;
        }

        const err = await banService.banUser(
            context,
            userAsGuildMember,
            invokingUser,
            reason,
            false,
            duration ?? null,
        );

        if (err) {
            await command.reply({
                content: err,
                ephemeral: true,
            });
            return;
        }

        await command.reply({
            content: `Ok Bruder, ich hab ${user} wegen ${reason} ${
                duration > 0 ? `für ${formatDuration(duration / 60 / 60)}` : ""
            } gebannt`,
        });
        return;
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const user = message.mentions.users.first();
        const invokingUser = message.author;

        if (!user) {
            await message.reply("Bruder, gib doch einen User an.");
            return;
        }

        const userAsGuildMember = message.guild?.members.resolve(user);

        if (!userAsGuildMember) {
            await message.reply("Bruder, der ist nicht auf diesem Server.");
            return;
        }

        // Extracting the reason in the text-based commands is kinda tricky ...
        // Especially due to the fact that we don't want to break existing functionality
        // and want to provide expected behavior for the mods

        // If we have a reference the first mention is in the reference and the reason is therefore
        // the whole message except the command itself
        const messageAfterCommand = message.content
            .substring(message.content.indexOf(this.name) + this.name.length)
            .trim();

        let reason = "Willkür";
        if (message.reference) {
            if (messageAfterCommand.trim().length > 0) {
                reason = messageAfterCommand;
            }
        } else {
            // Otherwise we would extract everything that is written AFTER the first mention
            const match = /\<@!?[0-9]+\> (.+)/.exec(messageAfterCommand);
            if (match?.[1]) {
                reason = match[1];
            }
        }

        const err = await banService.banUser(
            context,
            userAsGuildMember,
            invokingUser,
            reason,
            false,
            null,
        );

        if (err) {
            await message.reply({
                content: err,
            });
            return;
        }

        await message.reply({
            content: `Ok Bruder, ich hab ${user} wegen ${reason} gebannt`,
        });
    }
}
