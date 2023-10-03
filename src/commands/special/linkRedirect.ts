import type { Client } from "discord.js";

import type { ProcessableMessage } from "../../handler/cmdHandler.js";
import type { SpecialCommand, CommandResult } from "../command.js";

const linkMap: Record<string, string> = {
    // "reddit.com": "teddit.adminforge.de",
    // "old.reddit.com": "teddit.adminforge.de",
    // "tiktok.com": "proxitok.pabloferreiro.es",
    "tiktok.com": "tok.timewaste.kellertreff.com",

    // "twitter.com": "nitter.adminforge.de",
    // "x.com": "nitter.adminforge.de",
    "twitter.com": "nitter.timewaste.kellertreff.com",
    "x.com": "nitter.timewaste.kellertreff.com",

    "medium.com": "scribe.rip",
    "quora.com": "quetre.iket.me",
};

export class LinkRedirect implements SpecialCommand {
    name = "LinkRedirect";
    description = "Macht ein paar doofe Links zu tollen Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: ProcessableMessage): boolean {
        const domains = Object.keys(linkMap);
        const content = message.content.toLowerCase();
        return domains.some(
            domain =>
                content.includes(`https://${domain}`) ||
                content.includes(`https://www.${domain}`),
        );
    }

    async handleSpecialMessage(
        message: ProcessableMessage,
        _client: Client<boolean>,
    ): Promise<CommandResult> {
        const urls = message.content
            .toLowerCase()
            .split(" ")
            .filter(word => word.startsWith("https://"));
        if (urls.length === 0) return;

        const replacedUrls = urls
            .map(this.tryReplaceUrl)
            .filter((url): url is string => url !== undefined);

        // Workaround for archive.org links like https://web.archive.org/*/https://www.reddit.com/r/*
        // We could tweak the matches function instead.
        if (replacedUrls.length === 0) return;

        const msg = `Public Service Announcement für nicht krebsige Links:\n${replacedUrls
            .map(u => `<${u}>`)
            .join("\n")}`;
        await message.reply({
            content: msg,
            allowedMentions: { repliedUser: false },
        });
    }

    private tryReplaceUrl(url: string): string | undefined {
        const domains = Object.keys(linkMap);
        const domain = domains.find(
            d =>
                url.startsWith(`https://${d}`) ||
                url.startsWith(`https://www.${d}`),
        );
        if (!domain) return;

        const replacement = linkMap[domain];
        if (!replacement) return;

        return url.replace(
            new RegExp(`https:\/\/(www\.)?${domain}`),
            `https://${replacement}`,
        );
    }
}
