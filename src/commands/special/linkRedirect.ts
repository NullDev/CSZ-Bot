import { Client } from "discord.js";

import { ProcessableMessage } from "../../handler/cmdHandler.js";
import { SpecialCommand, CommandResult } from "../command.js";


const linkMap: Record<string, string> = {
    "reddit.com": "teddit.net",
    "old.reddit.com": "teddit.net",
    "tiktok.com": "proxitok.pabloferreiro.es",
    "twitter.com": "nitter.net",
    "medium.com": "scribe.rip",
    "quora.com": "quetre.iket.me"
};

export class LinkRedirect implements SpecialCommand {
    name: string = "LinkRedirect";
    description: string = "Macht ein paar doofe Links zu tollen Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: ProcessableMessage): boolean {
        const domains = Object.keys(linkMap);
        return domains.some(domain => message.content.toLowerCase().includes(`https://${domain}`));
    }

    async handleSpecialMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<CommandResult> {
        const domains = Object.keys(linkMap);
        const urls = message.content.toLowerCase().split(" ")
            .filter(word => domains.some(d => word.startsWith(`https://${d}`)));
        if(urls.length === 0) return;

        const replacedUrls = urls
            .map(this.tryReplaceUrl)
            .filter((url): url is string => url !== undefined);

        const msg = "Public Service Announcement für nicht krebsige Links:\n" + replacedUrls.join("\n");
        await message.reply({
            content: msg,
            allowedMentions: { repliedUser: false }
        });
    }

    private tryReplaceUrl(url: string): string | undefined {
        const domains = Object.keys(linkMap);
        const domain = domains.find(d => url.startsWith(`https://${d}`));
        if(!domain) return;

        const replacement = linkMap[domain];

        return url.replace(`https://${domain}`, `https://${replacement}`);
    }
}
