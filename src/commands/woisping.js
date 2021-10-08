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
 * @type {import("../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    const isMod = message.member.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name));

    if (!isMod && !message.member.roles.cache.has(config.ids.woisgang_role_id)){
        log.warn(`User "${message.author.tag}" (${message.author}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);

        return `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um diesen Command zu verwenden =(`;
    }

    const now = Date.now();

    if (!isMod && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
        return "Piss dich und spam nicht.";
    }

    const reason = `${Util.removeMentions(Util.cleanContent(args.join(" "), message))} (von ${message.member})`;

    if (isMod) {
        lastPing = now;
        await message.channel.send(`<@&${config.ids.woisgang_role_id}> ${reason}`);
    }
    else {
        const msg = await message.channel.send(`${pendingMessagePrefix} ${reason}`);
        await msg.react("👍");

        // we don't set lastPing here to allow multiple concurrent requests
        // let the most liked reason win...
    }
};

/**
 * Handles changes on reactions specific to this command
 *
 * @param {import("discord.js").MessageReaction} reactionEvent
 * @param {import("discord.js").User} user
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @returns {Promise<boolean>}
 */
export const reactionHandler = async(reactionEvent, user, client, message) => {
    if (message.embeds.length !== 0
        || !message.content.startsWith(pendingMessagePrefix)
        || reactionEvent.emoji.name !== "👍") {
        return false;
    }

    const reaction = message.reactions.cache.get("👍");

    // shouldn't happen
    if (!reaction) {
        return true;
    }

    const member = client.guilds.cache.get(config.ids.guild_id).members.cache.get(user.id);

    if (!member) {
        return true;
    }

    const isMod = member.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name));

    if (!isMod && !member.roles.cache.has(config.ids.woisgang_role_id)){
        reaction.users.remove(member.id);
        member.send("Sorry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.");
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
        reaction.users.remove(member.id);
        await member.send("Sorry, ich musste deine Zustimmung für den Woisgang-Ping entfernen, weil wir noch etwas warten müssen mit dem Ping.");
    }

    return true;
};

export const description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
