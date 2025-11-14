import * as fs from "node:fs/promises";

import type { User } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { BotContext } from "#/context.js";
import type { Loot } from "#/storage/db/model.js";
import type { LootTemplate } from "#/storage/loot.js";
import * as fontService from "#/service/font.js";
import { Vec2 } from "#/utils/math.js";
import { extendContext } from "#/utils/ExtendedCanvasContext.js";

const namePos = new Vec2(38, 567);
const avatarPos = new Vec2(790, 230);
const createdAtPos = new Vec2(798, 532);
const validUntilPos = new Vec2(965, 553);
const numberPos = new Vec2(38, 537);
const avatarMaxSize = new Vec2(180, 180);

const dateFormat = new Intl.DateTimeFormat("de", {
    dateStyle: "medium",
});

export async function drawBahncardImage(
    _context: BotContext,
    owner: User,
    template: LootTemplate,
    loot: Loot,
    drawAvatar: boolean,
    serialNumber: string,
): Promise<Buffer> {
    // biome-ignore lint/style/noNonNullAssertion: We check for assetPath below
    const assetPath = template.asset!;
    console.assert(assetPath, "Bahncard template must have an asset");

    const backgroundImage = await loadImage(await fs.readFile(assetPath));
    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = extendContext(canvas.getContext("2d"));

    ctx.drawImage(backgroundImage, 0, 0);

    if (drawAvatar) {
        const avatar = await loadImage(
            owner.displayAvatarURL({ forceStatic: true, extension: "png", size: 256 }),
        );

        const scale = Math.min(avatarMaxSize.x / avatar.width, avatarMaxSize.y / avatar.height);

        const avatarSize = new Vec2(avatar.width, avatar.height).scale(scale);

        ctx.drawImage(avatar, avatarPos.x, avatarPos.y, avatarSize.x, avatarSize.y);
    }

    ctx.fillTextExtended(
        namePos,
        "left",
        "top",
        "#ffffff",
        "38px",
        fontService.names.dbNeoBlack,
        owner.displayName,
    );

    ctx.fillTextExtended(
        numberPos,
        "left",
        "bottom",
        "#ffffff",
        "38px",
        fontService.names.dbNeoBlack,
        groupDigits(serialNumber),
    );

    ctx.fillTextExtended(
        createdAtPos,
        "left",
        "bottom",
        "#ffffff",
        "23px",
        fontService.names.dbNeoBlack,
        dateFormat.format(new Date(loot.claimedAt)),
    );

    ctx.fillTextExtended(
        validUntilPos,
        "right",
        "top",
        "#ffffff",
        "54px",
        fontService.names.dbNeoBlack,
        dateFormat.format(new Date("2038-01-19")),
    );

    return await canvas.encode("png");
}

function groupDigits(input: string): string {
    let res = "";
    for (let i = 0; i < input.length; i++) {
        res += input[i];
        if (i !== 0 && i % 4 === 3) {
            res += " ";
        }
    }
    return res;
}
