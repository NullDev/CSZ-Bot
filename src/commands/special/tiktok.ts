import { Message } from "discord.js";
// @ts-ignore
import tiktokDown from "tiktok-down";

import { SpecialCommand, CommandResult } from "../command.js";

const tt = tiktokDown({
    checkUpdate: true, // If you want to be notified when a new version is available
    clientIP: "127.0.0.1" // your ip address or you can use localhost IP
});

export class TikTokLink implements SpecialCommand {
    name: string = "Tiktok";
    description: string = "Embedded TikTok Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        const pattern = /((www|m\.)?tiktok\.com)|(vm\.tiktok\.com)/i;
        return pattern.test(message.content);
    }

    async handleSpecialMessage(message: Message): Promise<CommandResult> {
        await message.channel.sendTyping();
        // const video = await tt.download(message.content, "test.mp4");
        const metaData = await tt.getDetails({
            url: message.content
        });

        console.log(metaData);
        const videoName = `${metaData.author}.${metaData.video.format}`;


        await message.reply({
            content: (metaData.desc || "Dein TikTok du Hund:"),
            files: [{
                attachment: metaData.video.playAddr,
                name: videoName
            }]
        });
        await message.suppressEmbeds(true);
    }
}
