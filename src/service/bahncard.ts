import * as fs from "node:fs/promises";

import type { User } from "discord.js";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

import type { BotContext } from "@/context.js";
import type { Loot } from "@/storage/db/model.js";
import type { LootTemplate } from "src/storage/loot.js";

const namePos = { x: 38, y: 567 };
const avatarPos = { x: 775, y: 221 };
const avatarMaxSize = { width: 160, height: 160 };

GlobalFonts.registerFromPath("assets/fonts/DBNeoScreenSans-Black.woff2", "DBNeoScreenSans Black");
GlobalFonts.registerFromPath("assets/fonts/DBNeoScreenSans-Bold.woff2", "DBNeoScreenSans Bold");
GlobalFonts.registerFromPath(
    "assets/fonts/DBNeoScreenSans-Regular.woff2",
    "DBNeoScreenSans Regular",
);

export async function drawBahncardImage(
    _context: BotContext,
    owner: User,
    template: LootTemplate,
    _loot: Loot,
): Promise<Buffer> {
    // biome-ignore lint/style/noNonNullAssertion: We check for assetPath below
    const assetPath = template.asset!;
    console.assert(assetPath, "Bahncard template must have an asset");

    const backgroundImage = await loadImage(await fs.readFile(assetPath));
    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(backgroundImage, 0, 0);

    const avatar = await loadImage(
        owner.displayAvatarURL({ forceStatic: true, extension: "png", size: 256 }),
    );

    const aspectRatio = avatar.width / avatar.height;
    const avatarSize =
        aspectRatio > 1
            ? {
                  width: avatarMaxSize.width,
                  height: avatarMaxSize.width / aspectRatio,
              }
            : {
                  width: avatarMaxSize.height * aspectRatio,
                  height: avatarMaxSize.height,
              };

    ctx.drawImage(avatar, avatarPos.x, avatarPos.y, avatarSize.width, avatarSize.height);

    return await canvas.encode("png");
}
