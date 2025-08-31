import * as fs from "node:fs/promises";

import type { User } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { BotContext } from "@/context.js";
import type { Loot } from "@/storage/db/model.js";
import type { LootTemplate } from "@/storage/loot.js";
import * as fontService from "@/service/font.js";
import { Vec2 } from "@/utils/math.js";

const namePos = new Vec2(38, 567);
const avatarPos = new Vec2(775, 221);
const createdAtPos = new Vec2(798, 501);
const validUntilPos = new Vec2(736, 553);
const avatarMaxSize = { width: 160, height: 160 };

const dateFormat = new Intl.DateTimeFormat("de", {
    dateStyle: "medium",
});

export async function drawBahncardImage(
    _context: BotContext,
    owner: User,
    template: LootTemplate,
    loot: Loot,
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

    drawText(
        namePos,
        "left",
        "top",
        "#ffffff",
        `38px ${fontService.names.dbNeoBlack}`,
        owner.displayName,
    );

    drawText(
        createdAtPos,
        "left",
        "top",
        "#ffffff",
        `30px ${fontService.names.dbNeoBlack}`,
        dateFormat.format(new Date(loot.claimedAt)),
    );

    drawText(
        validUntilPos,
        "left",
        "top",
        "#ffffff",
        `54px ${fontService.names.dbNeoBlack}`,
        dateFormat.format(new Date("2038-01-19")),
    );

    return await canvas.encode("png");

    function drawText(
        pos: Vec2,
        textAlign: CanvasTextAlign,
        baseLine: CanvasTextBaseline,
        color: string,
        font: string,
        text: string,
    ) {
        ctx.save();
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = textAlign;
        ctx.textBaseline = baseLine;
        ctx.fillText(text, pos.x, pos.y);
        ctx.restore();
    }
}
