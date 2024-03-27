import moment from "moment";
import {
    type CommandInteraction,
    type GuildMember,
    type PermissionsString,
    type User,
    SlashCommandBuilder,
    SlashCommandIntegerOption,
    SlashCommandStringOption,
    SlashCommandUserOption,
} from "discord.js";
import type { Client } from "discord.js";

import * as banService from "../../storage/ban.js";
import type {
    ApplicationCommand,
    CommandResult,
    MessageCommand,
} from "../command.js";
import type { ProcessableMessage } from "../../handler/cmdHandler.js";
import type { BotContext } from "../../context.js";
import log from "@log";
import { unban } from "./unban.js";

// #region Banned User Role Assignment

async function assignBannedRoles(
    context: BotContext,
    user: GuildMember,
): Promise<boolean> {
    const defaultRole = user.guild.roles.cache.find(
        role => role.id === context.roles.default.id,
    );
    const bannedRole = user.guild.roles.cache.find(
        role => role.id === context.roles.banned.id,
    );

    if (!defaultRole || !bannedRole) {
        return false;
    }
    const currentRoles = [...user.roles.cache.map(r => r.id)];
    let newRoles = [...currentRoles, bannedRole.id].filter(
        r => r !== context.roles.default.id,
    );

    if (user.roles.cache.find(r => r.id === context.roles.gruendervaeter.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.gruendervaeter.id);
        newRoles.push(context.roles.gruendervaeter_banned.id);
    }

    if (user.roles.cache.find(r => r.id === context.roles.trusted.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.trusted.id);
        newRoles.push(context.roles.trusted_banned.id);
    }

    await user.edit({ roles: newRoles });
    return true;
}

export async function restoreRoles(
    context: BotContext,
    user: GuildMember,
): Promise<boolean> {
    log.debug(`Restoring roles from user ${user.id}`);
    const defaultRole = user.guild.roles.cache.find(
        role => role.id === context.roles.default.id,
    );
    const bannedRole = user.guild.roles.cache.find(
        role => role.id === context.roles.banned.id,
    );

    if (!defaultRole || !bannedRole) {
        return false;
    }
    const currentRoles = [...user.roles.cache.map(r => r.id)];
    let newRoles = [...currentRoles, defaultRole.id].filter(
        r => r !== context.roles.banned.id,
    );

    if (
        user.roles.cache.find(
            r => r.id === context.roles.gruendervaeter_banned.id,
        )
    ) {
        newRoles = newRoles.filter(
            r => r !== context.roles.gruendervaeter_banned.id,
        );
        newRoles.push(context.roles.gruendervaeter.id);
    }

    if (user.roles.cache.find(r => r.id === context.roles.trusted_banned.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.trusted_banned.id);
        newRoles.push(context.roles.trusted.id);
    }

    await user.edit({ roles: newRoles });

    return true;
}

// #endregion

export const processBans = async (context: BotContext) => {
    const now = new Date();

    try {
        const expiredBans = await banService.findExpiredBans(now);

        for (const expiredBan of expiredBans) {
            log.debug(
                `Expired Ban found by user ${expiredBan.userId}. Expired on ${expiredBan.bannedUntil}`,
            );
            const user = context.guild.members.cache.get(expiredBan.userId);
            // No user, no problem
            if (!user) {
                // Karteileiche detected, remove without noticing
                await banService.remove(expiredBan.userId);
                continue;
            }

            await unban(context, user);

            const msg = expiredBan.isSelfBan
                ? "Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet."
                : "Glückwunsch! Dein Bann in der Coding Shitpost Zentrale ist beendet. Sei nächstes Mal einfach kein Hurensohn.";

            await user.send(msg);
        }
    } catch (err) {
        log.error(err, "Error processing bans.");
    }
};

export async function ban(
    client: Client,
    context: BotContext,
    member: GuildMember,
    banInvoker: GuildMember | User,
    reason: string,
    isSelfBan: boolean,
    duration?: number,
) {
    log.debug(
        `Banning ${member.id} by ${banInvoker.id} because of ${reason} for ${duration}.`,
    );

    // No Shadow ban :(
    const botUser = client.user;
    if (
        member.id === "371724846205239326" ||
        (botUser && member.id === botUser.id)
    ) {
        return "Fick dich bitte.";
    }

    const existingBan = await banService.findExisting(member.user);
    if (existingBan !== null) {
        if (member.roles.cache.some(r => r.id === context.roles.banned.id)) {
            return "Dieser User ist bereits gebannt du kek.";
        }

        return "Dieser Nutzer ist laut Datenbank gebannt, ihm fehlt aber die Rolle. Fix das.";
    }

    const result = await assignBannedRoles(context, member);
    if (!result) return "Fehler beim Bannen. Bitte kontaktiere einen Admin.";

    const unbanAt =
        duration === undefined || duration === 0
            ? null // never
            : new Date(Date.now() + duration * 60 * 60 * 1000);
    const humanReadableDuration = duration
        ? moment.duration(duration, "hours").locale("de").humanize()
        : undefined;

    const banReasonChannel = member.guild.channels.resolve(
        context.textChannels.bot_log.id,
    );
    if (banReasonChannel?.isTextBased()) {
        await banReasonChannel.send({
            content: `${member} ${
                isSelfBan ? "hat sich selbst" : `wurde von ${banInvoker}`
            } ${
                humanReadableDuration
                    ? `für ${humanReadableDuration}`
                    : "bis auf unbestimmte Zeit"
            } gebannt. \nGrund: ${reason}`,
            allowedMentions: {
                users: [],
            },
        });
    }

    await banService.persistOrUpdate(member, unbanAt, isSelfBan, reason);

    await member.send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : `Banngrund: ${reason}`}
Falls du Fragen zu dem Bann hast, kannst du dich im ${
        context.textChannels.banned
    } Channel ausheulen.
Lg & xD™`);
}

export class BanCommand implements ApplicationCommand, MessageCommand {
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

    async handleInteraction(
        command: CommandInteraction,
        client: Client<boolean>,
        context: BotContext,
    ): Promise<void> {
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
            (durationHours ? durationHours : 0) +
            (durationMinutes ? durationMinutes / 60 : 0);
        const humanReadableDuration = moment
            .duration(duration, "hours")
            .locale("de")
            .humanize();

        const userAsGuildMember = command.guild?.members.resolve(user);
        if (!userAsGuildMember) {
            await command.reply({
                content: "Yo, der ist nicht auf dem Server",
                ephemeral: true,
            });
            return;
        }

        const err = await ban(
            client,
            context,
            userAsGuildMember,
            invokingUser,
            reason,
            false,
            duration ?? undefined,
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
                duration > 0 ? `für ${humanReadableDuration}` : ""
            } gebannt`,
        });
        return;
    }

    async handleMessage(
        message: ProcessableMessage,
        client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
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

        // Extracting the reason in the text-based commmands is kinda tricky ...
        // Especially due to the fact that we don't want to break existing functionallity
        // and want to provide expected behaviour for the mods

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

        const err = await ban(
            client,
            context,
            userAsGuildMember,
            invokingUser,
            reason,
            false,
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
