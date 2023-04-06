import { Client } from "discord.js";

import { ProcessableMessage } from "../../handler/cmdHandler.js";
import { SpecialCommand, CommandResult } from "../command.js";


const linkMap: Record<string, string> = {
    "reddit.com": "teddit.adminforge.de",
    "old.reddit.com": "teddit.adminforge.de",
    "tiktok.com": "proxitok.pabloferreiro.es",
    "twitter.com": "nitter.adminforge.de",
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
        const urls = message.content.toLowerCase().split(" ")
            .filter(word => word.startsWith("https://"));
        if(urls.length === 0) return;

        const replacedUrls = urls
            .map(this.tryReplaceUrl)
            .filter((url): url is string => url !== undefined);

        const msg = "Public Service Announcement für nicht krebsige Links:\n" + replacedUrls.map(u => `<${u}>`).join("\n");
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
        if(!replacement) return;

        return url.replace(`https://${domain}`, `https://${replacement}`);
    }
}
