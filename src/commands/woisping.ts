// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

import { Util } from "discord.js";
import { Client, Message,Channel, MessageReaction } from "discord.js";
import { CommandResult, MessageCommand } from "./command";
import log from "../utils/logger";


import { isMod, isWoisGang } from "../utils/userUtils";

import { getConfig } from "../utils/configHandler";

const config = getConfig();

const pendingMessagePrefix = "*(Pending-Woisgang-Ping, bitte zustimmen)*";

// Internal storage, no need to save this persistent
let lastPing = 0;

/**
 *
 * @param {import("discord.js").TextChannel} channel
 * @param {import("discord.js").User} pinger
 * @param {string} reason
 * @param {import("discord.js").User[]=} usersVotedYes
 * @returns {Promise<import("discord.js").Message<boolean>>}
 */
const sendWoisping = (channel: Channel, pinger: Client, reason: string, usersVotedYes?: Client[]) => {
    let contentString = "";
    if ( usersVotedYes ) {
        contentString = `<@&${config.ids.woisgang_role_id}> <@!${pinger.id}> hat Bock auf Wois. ${reason ? `Grund dafür ist ${reason}` : ""}\n${usersVotedYes.length > 0 ? `${usersVotedYes.map(u => `<@!${u}>`).join(",")} sind auch dabei` : ""}`;
    } else {
        contentString = `<@&${config.ids.woisgang_role_id}> <@!${pinger.id}> hat Bock auf Wois. ${reason ? `Grund dafür ist ${reason}` : ""}`;
    }

    return channel.send({
        content: contentString,
        allowedMentions: {
            roles: [ config.ids.woisgang_role_id ],
            users: [
                pinger.id,
                ...usersVotedYes?.map(u => u.id)
            ]
        }
    });
};

/**
 * Allows usage of @Woisgang mention for people having that role assigned
 *
 * @type {import("../types").CommandFunction}
 */

export class WoisCommand implements MessageCommand {
    name = "woisping";
    description = "Pingt die ganze Woisgang";

    async handleMessage(message: Message, _client: Client) {
        // remove first word of message and store the remaning elements into an array
        const args = message.content.split(" ").slice(1);
    
        const { author } = message;
        const pinger  = author;

        const isModMessage = isMod(message.member);

        if (!isModMessage && !isWoisGang(message.member)){
            log.warn(`User "${message.author.tag}" (${message.author}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);

            return `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um diesen Command zu verwenden =(`;
        }

        const now = Date.now();

        if (!isModMessage && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
            return "Piss dich und spam nicht.";
        }

        const reason = `${Util.cleanContent(args.join(" "), message)} (von ${message.member})`;

        if (isModMessage) {
            lastPing = now;
            await sendWoisping(message.channel, message.author, reason);
        }
        else {
            const msg = await message.channel.send({
                content: `${pendingMessagePrefix} <@!${pinger.id}> hat Bock auf Wois. ${reason ? `Grund dafür ist ${reason}` : ""}. Biste dabei?`,
                allowedMentions: {
                    users: [ pinger.id ]
                }
            });
            await msg.react("👍");

            // we don't set lastPing here to allow multiple concurrent requests
            // let the most liked reason win...
        }
    };
    
}
/**
 * Handles changes on reactions specific to this command
 *
 * @param {import("discord.js").MessageReaction} reactionEvent
 * @param {import("discord.js").User} user
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @returns {Promise<boolean>}
 */
export const reactionHandler = async(reactionEvent: MessageReaction, user: Client, client: Client, message: Message) => {
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

    const isModMessage = isMod(member);

    if (!isModMessage && !isWoisGang(member)){
        reaction.users.remove(member.id);
        member.send("Sorry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.");
        return true;
    }

    const amount = reaction.count - 1;
    const now = Date.now();
    const couldPing = lastPing + config.bot_settings.woisping_limit * 1000 <= now;

    if (isModMessage || (amount >= config.bot_settings.woisping_threshold && couldPing)) {
        const reason = message.content.substr(pendingMessagePrefix.length + 1);

        const {channel} = message;
        const pinger = message.mentions.users.first();
        // I don't know if this spreading is necessary
        const usersVotedYes = [ ...message.reactions.cache.filter(f => f.emoji.name === "👍").first().users.cache ];
        await message.delete();

        lastPing = now;
        await sendWoisping(channel, pinger, reason, usersVotedYes);
    }
    else if (!couldPing) {
        reaction.users.remove(member.id);
        await member.send("Sorry, ich musste deine Zustimmung für den Woisgang-Ping entfernen, weil wir noch etwas warten müssen mit dem Ping.");
    }

    return true;
};

export const description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
