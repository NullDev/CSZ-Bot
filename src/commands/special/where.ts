import { Message, Client, Util } from "discord.js";
import { fstat } from "fs";
import Jimp from "jimp";
import path from "path";
import { SpecialCommand } from "../command";
import * as fs from "fs";
import * as log from "../../utils/logger";

export class WhereCommand implements SpecialCommand {
    name: string = "Where";
    description: string = "Macht ein Ape-Meme";
    pattern: RegExp = /^wo(\s+\S+){1,3}\S[^?]$/i;
    randomness = 1;

    async handleSpecialMessage(message: Message, client: Client<boolean>): Promise<unknown> {
        const msg = Util.cleanContent(message.content.trim().toLowerCase().replace(/ß/g, "ss").toUpperCase(), message.channel);
        const meme = await createWhereMeme(msg);

        try {
            await message.channel.send({
                files: [{
                    attachment: meme,
                    name: path.basename(meme)
                }]
            });
        } catch(err) {
            log.error(`Could not create where meme: ${err}`);
        } finally {
            return await fs.promises.unlink(meme);
        }
    }
}

const createWhereMeme = async(text: string): Promise<string> => {
    const image = await Jimp.read("https://i.imgflip.com/52l6s0.jpg");
    const font = await Jimp.loadFont("./assets/impact.fnt");
    const filename = `/tmp/where_meme_${Date.now()}.jpg`;

    await image.print(font, 10, 10, {
        text,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
    }, image.bitmap.width).writeAsync(filename);

    return filename;
};
