import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import { Message, Client } from "discord.js";
import Ban from "../../storage/model/Ban";
import { getConfig } from "../../utils/configHandler";
import { ApplicationCommand, CommandPermission, MessageCommand, PermissionType } from "../command";
import * as cron from "node-cron";
import * as log from "../../utils/logger";

const config = getConfig();

// #region Banned User Role Assignment

const assignBannedRoles = async(user: GuildMember): Promise<boolean> => {
    let defaultRole = user.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = user.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) {
        return false;
    }

    await user.roles.remove(defaultRole);
    await user.roles.add(bannedRole);

    if (user.roles.cache.find(r => r.id === config.ids.gruendervaeter_role_id)) {
        await user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id)!);
        await user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id)!);
    }

    if (user.roles.cache.find(r => r.id === config.ids.trusted_role_id)) {
        await user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id)!);
        await user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id)!);
    }

    return true;
};

export const restoreRoles = async(user: GuildMember): Promise<boolean> => {
    let defaultRole = user.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = user.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) {
        return false;
    }

    await user.roles.add(defaultRole);
    await user.roles.remove(bannedRole);

    if (user.roles.cache.find(r => r.id === config.ids.gruendervaeter_banned_role_id)) {
        await user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id)!);
        await user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id)!);
    }

    if (user.roles.cache.find(r => r.id === config.ids.trusted_banned_role_id)) {
        await user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id)!);
        await user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id)!);
    }

    return true;
};

// #endregion

export const startCron = (client: Client) => {
    cron.schedule("* * * * *", async() => {
        const now = new Date();

        try {
            const expiredBans = await Ban.findExpiredBans(now);

            for (const expiredBan of expiredBans) {
                await expiredBan.destroy();

                const user = client.guilds.cache.get(config.ids.guild_id)?.members.cache.get(expiredBan.userId);
                if (!user) continue;

                restoreRoles(user);

                const msg = expiredBan.isSelfBan
                    ? "Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet."
                    : "Glückwunsch! Dein Bann in der Coding Shitpost Zentrale ist beendet. Sei nächstes Mal einfach kein Hurensohn.";

                await user.send(msg);
            }
        }
        catch (err) {
            log.error(`Error in cron job: ${err}`);
        }
    });
};

export const ban = async(member: GuildMember, reason: string, isSelfBan: boolean, duration?: number): Promise<void> => {
    await assignBannedRoles(member);

    const unbanAt = duration === undefined || duration === 0
        ? null // never
        : new Date(Date.now() + (duration * 60 * 60 * 1000));

    const banReasonChannel = member.guild.channels.resolve(config.bot_settings.ban_reason_channel_id);
    if(banReasonChannel && banReasonChannel.isText()) {
        banReasonChannel.send({
            content: `<@${member.id}> wurde gebannt, weil wegen ${reason} ${duration ? `(Dauer: ${duration} Stunden)` : ""} `
        });
    }

    await Ban.persistOrUpdate(member, unbanAt, isSelfBan, reason);
};

export class BanCommand implements ApplicationCommand, MessageCommand {
    name: string = "ban";
    description: string = "Joa, bannt halt einen ne?";
    permissions?: readonly CommandPermission[] | undefined = [{
        id: config.bot_settings.moderator_id,
        permission: true,
        type: PermissionType.ROLE
    }];
    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption(new SlashCommandUserOption()
                .setRequired(true)
                .setName("user")
                .setDescription("Der, der gebannt werden soll"))
            .addStringOption(new SlashCommandStringOption()
                .setRequired(true)
                .setName("reason")
                .setDescription("Warum er es verdient hat"))
            .addIntegerOption(new SlashCommandIntegerOption()
                .setRequired(false)
                .setName("hours")
                .setDescription("Wie lange in Stunden"))
            .addIntegerOption(new SlashCommandIntegerOption()
                .setRequired(false)
                .setName("minutes")
                .setDescription("Wie lange in Minuten"));
    }

    async handleInteraction(command: CommandInteraction, _client: Client<boolean>): Promise<void> {
        const user = command.options.getUser("user", true);
        const reason = command.options.getString("reason", true);
        const durationHours = command.options.getInteger("hours", false);
        const durationMinutes = command.options.getInteger("minutes", false);
        const duration = (durationHours ? durationHours : 0) + (durationMinutes ? durationMinutes / 60 : 0);

        const userAsGuildMember = command.guild?.members.resolve(user);
        if(!userAsGuildMember) {
            return command.reply({
                content: "Yo, der ist nicht auf dem Server",
                ephemeral: true
            });
        }

        await ban(userAsGuildMember, reason, false, duration ?? undefined);

        return command.reply({
            content: "Yo bruder, hab ihn gebannt"
        });
    }
    async handleMessage(message: Message, _client: Client<boolean>): Promise<unknown> {
        const user = message.mentions.users.first();

        if(!user) {
            return message.reply("Bruder, gib doch einen User an.");
        }

        const userAsGuildMember = message.guild?.members.resolve(user);

        if(!userAsGuildMember) {
            return message.reply("Bruder, der ist nicht auf diesem Server.");
        }

        const reason = "Fucking legacy ban, kein Bock das zu migrieren, mach ich später :tm:";

        await ban(userAsGuildMember, reason, false);

        return message.reply("Yo bruder, hab ihn gebannt");
    }
}
