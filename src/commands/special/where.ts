import { Message, Client, Util } from "discord.js";
import { createCanvas, loadImage, registerFont } from "canvas";
import { SpecialCommand } from "../command";


if (process.env.NODE_ENV === "production") {
    // This is a simple detection if we're running inside docker
    // We assume that every developer that wants to use this feature has impact installed
    registerFont("assets/impact.ttf", {
        family: "Impact"
    });
}

export class WhereCommand implements SpecialCommand {
    name: string = "Where";
    description: string = "Macht ein Ape-Meme";
    pattern: RegExp = /^wo(\s+\S+){1,3}\S[^?]$/i;
    randomness = 0.4;
    cooldownTime = 300000;

    async handleSpecialMessage(message: Message, client: Client<boolean>) {
        const subject = Util.cleanContent(message.content.trim().toUpperCase(), message.channel);

        const whereMemeBuffer = await WhereCommand.createWhereMeme(subject);

        await message.channel.send({
            files: [{
                attachment: whereMemeBuffer,
                name: subject + ".png"
            }]
        });
    }

    static async createWhereMeme(text: string): Promise<Buffer> {
        const whereImage = await loadImage("https://i.imgflip.com/52l6s0.jpg");
        const canvas = createCanvas(whereImage.width, whereImage.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(whereImage, 0, 0);

        const textPos = {
            x: (whereImage.width / 2) | 0,
            y: 40
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

        return canvas.toBuffer();
    }
}
