import * as fs from "node:fs/promises";

import type { User } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { BotContext } from "@/context.js";
import type { Loot } from "@/storage/db/model.js";
import type { LootTemplate } from "@/storage/loot.js";
import * as fontService from "@/service/font.js";

const namePos = { x: 38, y: 567 };
const avatarPos = { x: 775, y: 221 };
const avatarMaxSize = { width: 160, height: 160 };

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

    ctx.font = `38px ${fontService.names.dbNeoBlack}`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    ctx.fillText(owner.displayName, namePos.x, namePos.y, 600);

    return await canvas.encode("png");
}
