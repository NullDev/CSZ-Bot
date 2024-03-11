import { type Message, type Client, cleanContent } from "discord.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { readFile } from "fs/promises";

import type { SpecialCommand } from "../command.js";
import { countWords, substringAfter } from "../../utils/stringUtils.js";

if (process.env.NODE_ENV === "production") {
    // This is a simple detection if we're running inside docker
    // We assume that every developer that wants to use this feature has impact installed
    GlobalFonts.register(await readFile("assets/impact.ttf"), "Impact");
}

export class WhereCommand implements SpecialCommand {
    name = "Where";
    description = "Macht ein Ape-Meme";
    randomness = 0.001;
    cooldownTime = 300000;

    matches(message: Message<boolean>): boolean {
        const msg = message.content.toLowerCase();

        return (
            msg.startsWith("wo ") && countWords(substringAfter(msg, "wo ")) <= 3
        );
    }

    async handleSpecialMessage(message: Message, _client: Client<boolean>) {
        const subject = cleanContent(
            message.content.trim().toUpperCase(),
            message.channel,
        );

        const whereMemeBuffer = await WhereCommand.createWhereMeme(subject);

        await message.channel.send({
            files: [
                {
                    attachment: whereMemeBuffer,
                    name: `${subject}.png`,
                },
            ],
        });
    }

    static async createWhereMeme(text: string): Promise<Buffer> {
        const whereImage = await loadImage("https://i.imgflip.com/52l6s0.jpg");
        const canvas = createCanvas(whereImage.width, whereImage.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(whereImage, 0, 0);

        const textPos = {
            x: (whereImage.width / 2) | 0,
            y: 40,
        };

        ctx.font = "42px Impact";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 5;
        ctx.lineCap = "butt";
        ctx.strokeStyle = "#000";
        ctx.strokeText(text, textPos.x, textPos.y);

        ctx.fillStyle = "#fff";
        ctx.fillText(text, textPos.x, textPos.y);

        return await canvas.encode("png");
    }
}
