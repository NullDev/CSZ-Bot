import {
    SlashCommandBuilder,
    SlashCommandUserOption,
    ChatInputCommandInteraction,
} from "discord.js";
import type {
    Message,
    CommandInteraction,
    PermissionsString,
} from "discord.js";

import type { ApplicationCommand, MessageCommand } from "../command.js";
import type { BotContext } from "../../context.js";

import * as banService from "../../service/banService.js";

export default class UnbanCommand
    implements ApplicationCommand, MessageCommand
{
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

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!(command instanceof ChatInputCommandInteraction)) {
            // TODO: handle this on a type level
            return;
        }

        const user = command.options.getUser("user", true);

        const userAsGuildMember = command.guild?.members.resolve(user);
        if (!userAsGuildMember) {
            await command.reply({
                content: "Yo, der ist nicht auf dem Server",
                ephemeral: true,
            });
            return;
        }

        const err = await banService.unBanUser(context, userAsGuildMember);

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
    async handleMessage(message: Message, context: BotContext) {
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

        const err = await banService.unBanUser(context, userAsGuildMember);

        if (err) {
            await message.reply({
                content: err,
            });
            return;
        }

        await message.reply("Yo bruder, hab ihn entbannt");
    }
}
