import {
    type CommandInteraction,
    type GuildMember,
    type PermissionsString,
    SlashCommandBuilder,
    SlashCommandUserOption,
} from "discord.js";
import type { Message, Client } from "discord.js";

import * as banService from "../../storage/ban.js";
import type {
    ApplicationCommand,
    CommandResult,
    MessageCommand,
} from "../command.js";
import { restoreRoles } from "./ban.js";
import type { BotContext } from "../../context.js";

export async function unban(context: BotContext, member: GuildMember) {
    if (member.roles.cache.some(r => r.id === context.roles.default.id)) {
        return "Dieser User ist nicht gebannt du kek.";
    }

    await banService.remove(member.user.id);

    const result = await restoreRoles(context, member);
    if (!result) {
        return "Ich konnte die Rollen nicht wiederherstellen. Bitte kontaktiere einen Admin.";
    }
}

export class UnbanCommand implements ApplicationCommand, MessageCommand {
    name = "unban";
    description = "Joa, unbannt halt einen ne?";
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
        );

    async handleInteraction(
        command: CommandInteraction,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
        const user = command.options.getUser("user", true);

        const userAsGuildMember = command.guild?.members.resolve(user);
        if (!userAsGuildMember) {
            await command.reply({
                content: "Yo, der ist nicht auf dem Server",
                ephemeral: true,
            });
            return;
        }

        const err = await unban(context, userAsGuildMember);

        if (err) {
            await command.reply({
                content: err,
                ephemeral: true,
            });
            return;
        }

        await command.reply({
            content: "Yo bruder, hab ihn entbannt",
        });
    }
    async handleMessage(
        message: Message,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
        const user = message.mentions.users.first();

        if (!user) {
            await message.reply("Bruder, gib doch einen User an.");
            return;
        }

        const userAsGuildMember = message.guild?.members.resolve(user);

        if (!userAsGuildMember) {
            await message.reply("Bruder, der ist nicht auf diesem Server.");
            return;
        }

        const err = await unban(context, userAsGuildMember);

        if (err) {
            await message.reply({
                content: err,
            });
            return;
        }

        await message.reply("Yo bruder, hab ihn entbannt");
    }
}
