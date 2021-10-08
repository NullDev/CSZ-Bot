import * as cron from "node-cron";
import { Client, GuildMember } from "discord.js";

import * as log from "../../utils/logger";
import { getConfig } from "../../utils/configHandler";
import { CommandFunction, isGuildMessage } from "../../types";

import * as unban from "./unban";

const config = getConfig();

// number is a timestamp in milliseconds, like it is returned by Date.now()
export const bans: Record<GuildMember["id"], number> = {};

export const saveBans = () => {
    // tbd
};

export const loadBans = () => {
    // tbd
};


/**
 * @param durationInHours When omitted, it will be permanent
 */
export const ban = (user: GuildMember, durationInHours?: number) => {
    let defaultRole = user.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = user.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) {
        log.error("Ban: default role and/or banned role is missing");
        return false;
    }

    user.roles.remove(defaultRole);
    user.roles.add(bannedRole);

    // If the user is a gruendervaeter, he gets a _different_ ban and thus, different role
    const gruendervaeterRole = user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id);
    if (gruendervaeterRole) {
        user.roles.remove(gruendervaeterRole);

        const roleToAdd = user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id);
        if (roleToAdd) {
            user.roles.add(roleToAdd);
        } else {
            log.warn(`Could not find role with id ${config.ids.gruendervaeter_banned_role_id}`);
        }
    }

    // Same for trusted users
    const trustedRole = user.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id);
    if (trustedRole) {
        user.roles.remove(trustedRole);

        const trustedBannedRole = user.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id);
        if (trustedBannedRole) {
            user.roles.add(trustedBannedRole);
        } else {
            log.warn(`Could not find role with id ${config.ids.trusted_banned_role_id}`);
        }
    }

    const unbanAtTimestamp = durationInHours === undefined
        ? 0 // never
        : Date.now() + (durationInHours * 60 * 60 * 1000); // using milliseconds here

    bans[user.id] = unbanAtTimestamp;

    saveBans();

    return true;
};

/**
 * Ban a given user.
 */
export const run: CommandFunction = async (client, message, args) => {
    if (!isGuildMessage(message)) return;
    let mentioned = message.mentions?.users?.first?.();
    let reason = args.slice(1).join(" ");

    if (!mentioned) return `Da ist kein username... Mach \`${config.bot_settings.prefix.mod_prefix}ban \@username [Banngrund]\``;

    let mentionedUser = message.guild.members.cache.get(mentioned.id);

    if (mentionedUser === undefined) return `Konnte User <@${mentioned.id}> nicht finden.`;

    if (mentionedUser.id === "371724846205239326" || mentionedUser.id === client.user?.id) return "Fick dich bitte.";

    if (mentionedUser.roles.cache.some(r => r.id === config.ids.banned_role_id)
        && (!(mentionedUser.id in bans) || bans[mentionedUser.id] === 0)) return "Dieser User ist bereits gebannt du kek.";

    if (!ban(mentionedUser)) return "Eine der angegebenen Rollen für das bannen existiert nich.";

    await message.channel.send(`User ${mentionedUser} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}`);
    await mentionedUser.send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#${config.ids.banned_channel_id}> Channel ausheulen.

Lg & xD™`
    );
};
export const startCron = (client: Client) => {
    cron.schedule("* * * * *", () => {
        let userIds = Object.keys(bans);
        let modified = false;

        for (let userId of userIds) {
            let unbanAt = bans[userId];

            if (unbanAt !== 0 && unbanAt < Date.now()) {
                let user = client.guilds.cache.get(config.ids.guild_id)?.members.cache.get(userId);

                if (user) {
                    unban.unban(user);
                    user.send("Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet.");
                }

                delete bans[userId];
                modified = true;
            }
        }

        if (modified) {
            saveBans();
        }
    });
};

export const description = `Bannt einen User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}ban username [Banngrund]`;
