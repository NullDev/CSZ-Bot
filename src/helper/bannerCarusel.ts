import * as path from "node:path";
import { readdir } from "node:fs/promises";

import type { BotContext } from "../context.js";
import log from "../utils/logger.js";

const pickRandomBanner = (bannersDir: string, files: string[]): string => {
    const newBanner = files[Math.floor(Math.random() * files.length)];
    return path.resolve(bannersDir, newBanner);
};

export const rotate = async (context: BotContext) => {
    log.debug("Rotating banners");

    const currentHash = context.guild.banner;
    const files = await readdir(context.bannersDir);

    if (files.length === 0) {
        return;
    }

    const file = pickRandomBanner(context.bannersDir, files);

    await context.guild.setBanner(file);
    const newHash = context.guild.banner;

    // I'm too lazy to implement something like a persistence logic here.
    // If the set banner is not updated (= is the same as before), just pick
    // a new one.
    if (newHash === currentHash && files.length > 1) {
        const secondTry = pickRandomBanner(context.bannersDir, files.filter(f => f !== file));
        await context.guild.setBanner(secondTry);
    }
};
