// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import type { CommandFunction } from "../types";
// Dependencies
import {Util} from "discord.js";
import {isEmotifizierer, isTrusted} from "../utils/userUtils";


/**
 * Sends instructions on how to ask better questions
 */
export const run: CommandFunction = async(client, message, args) => {
    // parse options
    const pinger = message.guild?.members.cache.get(message.member!.user.id)!;
    if (!isEmotifizierer(pinger)){
        await message.channel.send("Bist nicht cool genug");
    }

    if (args.length >= 1) {
        const parseEmoji = Util.parseEmoji(args[0]);

        if(parseEmoji!==null){
            let extension= parseEmoji.animated?".gif":".png";
            let emoteUrl=`https://cdn.discordapp.com/emojis/${parseEmoji.id}`+extension;
            let emotename= args.length>=2?args[1]:parseEmoji.name;
            message.guild?.emojis.create(emoteUrl,emotename).then((emote) =>  message.channel.send(`Hab \<:${emote.name}:${emote.id}\> als \`${emote.name}\` hinzugefügt`));
        }

    }
    else {
        await message.channel.send("Argumente musst du schon angeben, du Mongo");
    }
    await message.delete();
};

export const description = "Klaut emotes";
