import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandUserOption } from "@discordjs/builders";
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

export const ban = async(client: Client, member: GuildMember, reason: string, isSelfBan: boolean, duration?: number): Promise<string | undefined> => {
    if (member.id === "371724846205239326" || member.id === client.user!.id) return "Fick dich bitte.";

    const existingBan = await Ban.findExisting(member.user);
    if (existingBan !== null) {
        if (member.roles.cache.some(r => r.id === config.ids.banned_role_id)) { return "Dieser User ist bereits gebannt du kek."; }

        return "Dieser nutzer ist laut Datenbank gebannt, ihm fehlt aber die Rolle. Fix das.";
    }

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

    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<void> {
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

        const err = await ban(client, userAsGuildMember, reason, false, duration ?? undefined);

        if(err) {
            return command.reply({
                content: err,
                ephemeral: true
            });
        }

        return command.reply({
            content: "Yo bruder, hab ihn gebannt"
        });
    }
    async handleMessage(message: Message, client: Client<boolean>): Promise<unknown> {
        const user = message.mentions.users.first();

        if(!user) {
            return message.reply("Bruder, gib doch einen User an.");
        }

        const userAsGuildMember = message.guild?.members.resolve(user);

        if(!userAsGuildMember) {
            return message.reply("Bruder, der ist nicht auf diesem Server.");
        }

        // Extracting the reason in the text-based commmands is kinda tricky ...
        // Especially due to the fact that we don't want to break existing functionallity
        // and want to provide expected behaviour for the mods

        // If we have a reference the first mention is in the reference and the reason is therefore
        // the whole message except the command itself
        const messageAfterCommand = message.content.substr(message.content.indexOf(this.name) + this.name.length).trim();
        let reason = "Willkür";
        if(message.reference && messageAfterCommand.trim().length > 0) {
            reason = messageAfterCommand;
        }
        // Otherwhise we would extract everything that is written AFTER the first mention
        else {
            const match = /\<@[0-9]+\> (.*)/.exec(messageAfterCommand);
            if (match && match[1]) {
                reason = match[1];
            }
        }

        const err = await ban(client, userAsGuildMember, reason, false);

        if(err) {
            return message.reply({
                content: err
            });
        }

        return message.reply("Yo bruder, hab ihn gebannt");
    }
}
