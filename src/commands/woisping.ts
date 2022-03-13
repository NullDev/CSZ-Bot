// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

import { TextBasedChannel, Util } from "discord.js";
import { Client, Message, MessageReaction, User } from "discord.js";
import { CommandResult, MessageCommand } from "./command";
import log from "../utils/logger";


import { isMod, isWoisGang } from "../utils/userUtils";

import { getConfig } from "../utils/configHandler";

const config = getConfig();

const pendingMessagePrefix = "*(Pending-Woisgang-Ping, bitte zustimmen)*";

// Internal storage, no need to save this persistent
let lastPing = 0;


const sendWoisping = (channel: TextBasedChannel, pinger: User, reason: string, usersVotedYes: User[] = []): Promise<any> => {
    let contentString = "";
    console.log("profidebugging11");
    if ( usersVotedYes ) {
        contentString = `<@&${config.ids.woisgang_role_id}> <@!${pinger.id}> hat Bock auf Wois. ${reason ? `Grund dafür ist ${reason}` : ""}\n${usersVotedYes.length > 0 ? `${usersVotedYes.map(u => `<@!${u}>`).join(",")} sind auch dabei` : ""}`;
    }
    else {
        contentString = `<@&${config.ids.woisgang_role_id}> <@!${pinger.id}> hat Bock auf Wois. ${reason ? `Grund dafür ist ${reason}` : ""}`;
    }

    console.log("profidebugging12");
    const lol = {
        content: contentString,
        allowedMentions: {
            roles: [ config.ids.woisgang_role_id ],
            users: [ ...new Set([ pinger.id, ...usersVotedYes?.map(u => u.id) ]) ]
        }
    };
    console.log(JSON.stringify(lol));
    const lolwat = channel.send(lol);
    console.log("profidebugging10000");
    return lolwat;
};


export class WoisCommand implements MessageCommand {
    name = "woisping";
    description = "Pingt die ganze Woisgang";

    async handleMessage(message: Message, _client: Client): Promise<CommandResult>  {
        // remove first word of message and store the remaning elements into an array
        const args = message.content.split(" ").slice(1);

        const { author, member } = message;
        const pinger  = author;

        if(!member) {
            throw new Error("Member is not defined");
        }

        const isModMessage = isMod(member);

        if (!isModMessage && !isWoisGang(member)){
            log.warn(`User "${message.author.tag}" (${message.author}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);

            await message.reply(`Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um diesen Command zu verwenden =(`);

            return;
        }

        const now = Date.now();

        if (!isModMessage && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
            await message.reply("Piss dich und spam nicht.");
            return;
        }

        const reason = `${Util.cleanContent(args.join(" "), message.channel)} (von ${message.member})`;

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
    }
}

export const reactionHandler = async(reactionEvent: MessageReaction, user: User, client: Client, message: Message): Promise<any> => {
    if (message.embeds.length !== 0
        || !message.content.startsWith(pendingMessagePrefix)
        || reactionEvent.emoji.name !== "👍") {
        return false;
    }

    const reaction = message.reactions.cache.get("👍");
    console.log("profidebugging1");

    // shouldn't happen
    if (!reaction) {
        log.debug("Reaction not found");
        return true;
    }
console.log("profidebugging2");
    const member = client.guilds.cache.get(config.ids.guild_id)!.members.cache.get(user.id);

    if (!member) {
        log.debug("Member not found");
        return true;
    }

    console.log("profidebugging3");
    const isModMessage = isMod(member);

    if (!isModMessage && !isWoisGang(member)){
        reaction.users.remove(member.id);
        member.send("Sorry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.");
        return true;
    }
    console.log("profidebugging4");

    const amount = reaction.count - 1;
    const now = Date.now();
    const couldPing = lastPing + config.bot_settings.woisping_limit * 1000 <= now;

    console.log("profidebugging5");
    if (isModMessage || (amount >= config.bot_settings.woisping_threshold && couldPing)) {
        const reason = message.content.substr(pendingMessagePrefix.length + 1);

        console.log("profidebugging6");
        const {channel} = message;
        const pinger = message.mentions.users.first();

        // shouldn't happen
        if (!pinger) {
            log.debug("Pinger not found");
            return true;
        }
        console.log("profidebugging7");

        // I don't know if this spreading is necessary
        const usersVotedYes = [ ...reaction.users.cache.values() ];

        console.log("profidebugging8");
        lastPing = now;
        try {
            await sendWoisping(channel, pinger, reason, usersVotedYes);
        }
        catch (e) {
            console.log("BOOM!");
            console.error(e);
        }
        console.log("profidebugging9");
        await message.delete();
        console.log("profidebugging209");
    }
    else if (!couldPing) {
        reaction.users.remove(member.id);
        await member.send("Sorry, ich musste deine Zustimmung für den Woisgang-Ping entfernen, weil wir noch etwas warten müssen mit dem Ping.");
    }

    console.log("profidebugging10");
    return true;
};

export const description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
