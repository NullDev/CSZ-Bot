import * as path from "node:path";
import * as fs from "node:fs/promises";

import type { BotContext } from "#/context.ts";
import { randomEntry } from "#/service/random.ts";
import log from "#log";

export const rotate = async (context: BotContext) => {
    log.debug("Rotating banners");

    const files = await fs.readdir(context.path.banners);
    if (files.length === 0) {
        return;
    }

    const file = pickRandomBanner(context.path.banners, files);

    const currentHash = context.guild.banner;
    await context.guild.setBanner(file);
    const newHash = context.guild.banner;

    // I'm too lazy to implement something like a persistence logic here.
    // If the set banner is not updated (= is the same as before), just pick
    // a new one.
    if (newHash === currentHash && files.length > 1) {
        const secondTry = pickRandomBanner(
            context.path.banners,
            files.filter(f => f !== file),
        );
        await context.guild.setBanner(secondTry);
    }
};

const pickRandomBanner = (bannersDir: string, files: string[]): string => {
    const newBanner = randomEntry(files);
    return path.resolve(bannersDir, newBanner);
};
