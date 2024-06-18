import * as fs from "node:fs/promises";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { GuildMember } from "discord.js";

import type { CommandResult, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import log from "@log";

const createBonkMeme = async (author: GuildMember): Promise<Buffer> => {
    const bonk = await fs.readFile("assets/bonk.png");
    const bonkImage = await loadImage(bonk);

    const avatarURL = author.displayAvatarURL({ extension: "png", size: 128 });
    const avatarImage = await loadImage(avatarURL);

    const canvas = createCanvas(bonkImage.width, bonkImage.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(avatarImage, 120, 90);
    ctx.drawImage(bonkImage, 0, 0);

    return await canvas.encode("png");
};

export class BonkCommand implements MessageCommand {
    name = "bonk";
    aliases = ["bong"];
    description = `Bonkt einen Nutzer und ersetzt den rechten gelben Hund mit dem Avatar des Nutzers.
Usage: $COMMAND_PREFIX$bonk
       $COMMAND_PREFIX$bonk @ShadowByte#1337
       Oder auf eine Nachricht mit $COMMAND_PREFIX$bonk antworten.`;

    async handleMessage(message: ProcessableMessage): Promise<CommandResult> {
        const messageRef = message.reference?.messageId;
        const messagePing = message.mentions?.users.first();
        let toBeBonked = await message.guild.members.fetch(message.author);

        // If reply to message
        if (messageRef) {
            const msg = await message.channel.messages.fetch(messageRef);
            toBeBonked = await message.guild.members.fetch(msg.author);
        } else if (messagePing) {
            // If a user is mentioned in the message
            const mentionedUser = message.mentions.users.first();
            if (mentionedUser) {
                toBeBonked = await message.guild.members.fetch(mentionedUser);
            }
        }

        const bonkBuffer = await createBonkMeme(toBeBonked);
        try {
            await message.channel.send({
                files: [
                    {
                        name: "bonk.png",
                        attachment: bonkBuffer,
                    },
                ],
            });
        } catch (err) {
            log.error(err, "Could not create where meme");
        }
    }
}
