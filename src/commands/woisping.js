// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

import { Util } from "discord.js";

import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
const config = getConfig();

const pendingMessagePrefix = "*(Pending-Woisgang-Ping, bitte zustimmen)*";

// Internal storage, no need to save this persistent
let lastPing = 0;


/**
 * Allows usage of @Woisgang mention for people having that role assigned
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Promise<Function>} callback
 */
export const run = async(client, message, args, callback) => {
    const isMod = message.member.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name));

    if (!isMod && !message.member.roles.cache.has(config.ids.woisgang_role_id)){
        log.warn(`User "${message.author.tag}" (${message.author}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);

        return callback(
            `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden =(`
        );
    }

    const now = Date.now();

    if (!isMod && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
        return callback("Piss dich und spam nicht.");
    }

    const reason = `${Util.removeMentions(Util.cleanContent(args.join(" "), message))} (von ${message.member})`;

    if (isMod) {
        lastPing = now;
        message.channel.send(`<@&${config.ids.woisgang_role_id}> ${reason}`);
    }
    else {
        const msg = await message.channel.send(`${pendingMessagePrefix} ${reason}`);
        msg.react("👍");

        // we don't set lastPing here to allow multiple concurrent requests
        // let the most liked reason win...
    }

    return callback();
};

/**
 * Handles changes on reactions specific to this command
 *
 * @param {any} event
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @returns
 */
export const reactionHandler = async(event, client, message) => {
    if (message.embeds.length !== 0
		|| !message.content.startsWith(pendingMessagePrefix)
		|| event.d.emoji.name !== "👍") {
        return false;
    }

    const reaction = message.reactions.cache.get("👍");

    // shouldn't happen
    if (!reaction) {
        return true;
    }

    const { d: data } = event;

    const user = client.guilds.cache.get(config.ids.guild_id).members.cache.get(data.user_id);

    if (!user) {
        return true;
    }

    const isMod = user.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name));

    if (!isMod && !user.roles.cache.has(config.ids.woisgang_role_id)){
        reaction.users.remove(data.user_id);
        user.send("Somry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.");
        return true;
    }

    const amount = reaction.count - 1;
    const now = Date.now();
    const couldPing = lastPing + config.bot_settings.woisping_limit * 1000 <= now;

    if (isMod || (amount >= config.bot_settings.woisping_threshold && couldPing)) {
        const reason = message.content.substr(pendingMessagePrefix.length + 1);

        const {channel} = message;
        await message.delete();

        lastPing = now;
        channel.send(`<@&${config.ids.woisgang_role_id}> ${reason}`);
    }
    else if (!couldPing) {
        reaction.users.remove(data.user_id);
        user.send("Somry, ich musste deine Zustimmung für den Woisgang-Ping entfernen, weil wir noch etwas warten müssen mit dem Ping.");
    }

    return true;
};

export const description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
