import path from "node:path";

import Jimp from "jimp";
import * as fs from "fs";
import { Client, GuildMember } from "discord.js";

import { CommandResult, MessageCommand } from "./command.js";
import log from "../utils/logger.js";
import { getConfig } from "../utils/configHandler.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";

const config = getConfig();

const createBonkMeme = async(author: GuildMember): Promise<string> => {
    const image = await Jimp.read("https://i.imgur.com/nav6WWX.png");
    const filename = `/tmp/bonk_meme_${Date.now()}.png`;
    const avatarURL = author.displayAvatarURL({ extension: "png" });
    let avatar = await Jimp.read(avatarURL);

    avatar = avatar.resize(128, 128);

    await image.composite(avatar, 120, 90, {
        mode: Jimp.BLEND_DESTINATION_OVER,
        opacitySource: 1,
        opacityDest: 1
    }).writeAsync(filename);

    return filename;
};

export class BonkCommand implements MessageCommand {
    name: string = "bonk";
    aliases = ["bong"];
    description: string = `Bonkt einen Nutzer und ersetzt den rechten gelben Hund mit dem Avatar des Nutzers.
Usage: ${config.bot_settings.prefix.command_prefix}bonk
       ${config.bot_settings.prefix.command_prefix}bonk @ShadowByte#1337
       Oder auf eine Nachricht mit ${config.bot_settings.prefix.command_prefix}bonk antworten.`;

    async handleMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<CommandResult> {
        const messageRef = message.reference?.messageId;
        const messagePing = message.mentions?.users.first();
        let toBeBonked: GuildMember = await message.guild.members.fetch(message.author);

        // If reply to message
        if(messageRef) {
            const msg = await message.channel.messages.fetch(messageRef);
            toBeBonked = await message.guild.members.fetch(msg.author);
        } // If a user is mentioned in the message
        else if (messagePing) {
            const mentionedUser = message.mentions.users.first();
            if (mentionedUser) {
                toBeBonked = await message.guild.members.fetch(mentionedUser);
            }
        }

        const meme = await createBonkMeme(toBeBonked);
        try {
            await message.channel.send({
                files: [{
                    attachment: meme,
                    name: path.basename(meme)
                }]
            });
        }
        catch(err) {
            log.error("Could not create where meme", err);
        }
        finally {
            return fs.promises.unlink(meme);
        }
    }
}
