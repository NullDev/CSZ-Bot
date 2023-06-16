import type { Message } from "discord.js";
import fetch from "node-fetch";
import type { SpecialCommand, CommandResult } from "../command.js";

const proxitokInstance = "https://proxitok.pussthecat.org";
// const downloadUrlRegex = /href=["'](\/download[^"']*)["']/;
const downloadUrlRegex = /source src=["'](\/stream[^"']*)["']/;

export class TikTokLink implements SpecialCommand {
    name = "Tiktok";
    description = "Embedded TikTok Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        const pattern = /((www|m\.)?tiktok\.com)|(vm\.tiktok\.com)/i;
        return pattern.test(message.content);
    }

    async handleSpecialMessage(message: Message): Promise<CommandResult> {
        await message.channel.sendTyping();
        const tikTokUrl = message.content;
        const searchUrl = `${proxitokInstance}/redirect/search?term=${tikTokUrl}&type=url`;
        const response = await fetch(searchUrl, {
            method: "GET",
            redirect: "follow",
        });

        if (!response.ok) {
            return;
        }

        const defaultResponse = () =>
            message.reply({
                content: `Hab's nicht geschafft aber guck mal hier: ${response.url}`,
                allowedMentions: {
                    repliedUser: false,
                },
            });

        const responseString = await response.text();
        const linkCandidates = responseString.match(downloadUrlRegex);
        if (linkCandidates === null || linkCandidates[1] === null) {
            await defaultResponse();
            return;
        }

        const link = linkCandidates[1];

        // Hardcoded check to check if download is available.
        // If we wouldn't do that the user will get a weird looking file.
        if (link === "/stream?url=") {
            await defaultResponse();
            return;
        }

        const downloadLink = `${proxitokInstance}${link}`;

        await message.reply({
            content: `Dein TikTok du Hund: <${response.url}>`,
            allowedMentions: {
                repliedUser: false,
            },
            files: [
                {
                    attachment: downloadLink,
                    name: "ehrenlose-tiktok.mp4",
                },
            ],
        });
        await message.suppressEmbeds(true);
    }
}
