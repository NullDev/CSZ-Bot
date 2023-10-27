import type { Client } from "discord.js";

import type { ProcessableMessage } from "../../handler/cmdHandler.js";
import type { SpecialCommand, CommandResult } from "../command.js";

type LinkConfig = {
    redirectTo: string;
    enhanceEmbed?: string;
};

type LinkReplacementResult = {
    redirects: string[];
    enhancedEmbeds: string[];
};

const linkMap: Record<string, LinkConfig> = {
    // "reddit.com": { redirectTo: "teddit.adminforge.de" },
    // "old.reddit.com": { redirectTo: "teddit.adminforge.de" },
    // "tiktok.com": { redirectTo: "proxitok.pabloferreiro.es" },
    // "tiktok.com": { redirectTo: "tok.timewaste.kellertreff.com" },

    "twitter.com": {
        redirectTo: "nitter.adminforge.de",
        enhanceEmbed: "fxtwitter.com",
    },
    "x.com": { redirectTo: "nitter.adminforge.de", enhanceEmbed: "fixupx.com" },
    // "twitter.com": { redirectTo: "nitter.timewaste.kellertreff.com" },
    // "x.com": { redirectTo: "nitter.timewaste.kellertreff.com" },

    "medium.com": { redirectTo: "scribe.rip" },
    "quora.com": { redirectTo: "quetre.iket.me" },
};

export class LinkEnhancer implements SpecialCommand {
    name = "LinkEnhancer";
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

        const matchingConfigs = Object.fromEntries(
            Object.entries(linkMap).filter(([domain]) => {
                return urls.some(url => url.startsWith(`https://${domain}`));
            }),
        );

        if (matchingConfigs === undefined) return;

        const enhancedUrls = this.enhanceAllUrls(urls, matchingConfigs);

        if (
            enhancedUrls.enhancedEmbeds.length === 0 &&
            enhancedUrls.redirects.length === 0
        )
            // Workaround for archive.org links like https://web.archive.org/*/https://www.reddit.com/r/*
            // We could tweak the matches function instead.
            return;

        const redirects = enhancedUrls.redirects.map(u => `<${u}>`).join("\n");
        const enhancedEmbeds = enhancedUrls.enhancedEmbeds.join("\n");
        const msg = `Public Service Announcement für nicht krebsige Links:\n${
            redirects.length > 0 ? `${redirects}\n` : ""
        }${enhancedEmbeds}`;
        await message.reply({
            content: msg,
            allowedMentions: { repliedUser: false },
        });

        if (enhancedEmbeds.length > 0) {
            // If we have enhanced embeds, we can suppress the original embeds.
            // However it is possible, that the user posted more embeds than we enhanced.
            // Don't care lol.
            await message.suppressEmbeds();
        }
    }

    private enhanceAllUrls(
        urls: string[],
        config: Record<string, LinkConfig>,
    ): LinkReplacementResult {
        const redirects: string[] = [];
        const enhancedEmbeds: string[] = [];

        urls.forEach(url => {
            const domain = url.split("/")[2];
            const urlConfig = config[domain];
            if (urlConfig === undefined) return;

            const redirectTo = urlConfig.redirectTo;
            const enhancedEmbed = urlConfig.enhanceEmbed;

            redirects.push(this.enhanceUrl(url, domain, redirectTo));
            if (enhancedEmbed !== undefined) {
                enhancedEmbeds.push(
                    this.enhanceUrl(url, domain, enhancedEmbed),
                );
            }
        });

        return { redirects, enhancedEmbeds };
    }

    private enhanceUrl(
        url: string,
        suckyhost: string,
        enhancedHost: string,
    ): string {
        return url.replace(
            new RegExp(`https:\/\/(www\.)?${suckyhost}`),
            `https://${enhancedHost}`,
        );
    }
}
