import {
    CommandInteraction,
    GuildMember,
    PermissionsString,
    SlashCommandBuilder,
    SlashCommandUserOption,
} from "discord.js";
import { Message, Client } from "discord.js";

import Ban from "../../storage/model/Ban.js";
import { getConfig } from "../../utils/configHandler.js";
import type {
    ApplicationCommand,
    CommandResult,
    MessageCommand,
} from "../command.js";
import { restoreRoles } from "./ban.js";

const config = getConfig();

export const unban = async (member: GuildMember) => {
    if (member.roles.cache.some((r) => r.id === config.ids.default_role_id))
        return "Dieser User ist nicht gebannt du kek.";

    await Ban.remove(member.user);

    const result = await restoreRoles(member);
    if (!result)
        return "Ich konnte die Rollen nicht wiederherstellen. Bitte kontaktiere einen Admin.";
};

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

        const err = await unban(userAsGuildMember);

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

        const err = await unban(userAsGuildMember);

        if (err) {
            await message.reply({
                content: err,
            });
            return;
        }

        await message.reply("Yo bruder, hab ihn entbannt");
    }
}
