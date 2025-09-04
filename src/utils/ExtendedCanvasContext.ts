import type { SKRSContext2D, Image } from "@napi-rs/canvas";

import * as fontService from "@/service/font.js";
import type { Vec2 } from "./math.js";

export interface ExtendedCanvasContext extends SKRSContext2D {
    circlePath(
        position: Vec2,
        radius: number,
        horizontalAlign: HorizontalAlign,
        verticalAlign: VerticalAlign,
    ): void;

    fillTextExtended(
        position: Vec2,
        textAlign: CanvasTextAlign,
        baseLine: CanvasTextBaseline,
        color: string,
        fontSize: string,
        fontName: string,
        text: string,
    ): void;

    drawEmojiCentered(sizePx: number, centerPos: Vec2, symbol: string): void;

    drawImageEx(pos: Vec2, size: Vec2, image: Image): void;
}

export type VerticalAlign = "top" | "middle" | "bottom";
export type HorizontalAlign = "left" | "center" | "right";

export function extendContext(ctx: SKRSContext2D): ExtendedCanvasContext {
    const ectx = ctx as ExtendedCanvasContext;

    ectx.circlePath = function circlePath(
        position: Vec2,
        radius: number,
        horizontalAlign: HorizontalAlign,
        verticalAlign: VerticalAlign,
    ) {
        ctx.save();

        let offsetX = 0;
        let offsetY = 0;

        switch (horizontalAlign) {
            case "left":
                offsetX = radius;
                break;
            case "center":
                offsetX = 0;
                break;
            case "right":
                offsetX = -radius;
                break;
        }

        switch (verticalAlign) {
            case "top":
                offsetY = radius;
                break;
            case "middle":
                offsetY = 0;
                break;
            case "bottom":
                offsetY = -radius;
                break;
        }

        ctx.translate(position.x + offsetX, position.y + offsetY);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);

        ctx.restore();
    };

    ectx.fillTextExtended = function fillTextExtended(
        position: Vec2,
        textAlign: CanvasTextAlign,
        baseLine: CanvasTextBaseline,
        color: string,
        fontSize: string,
        fontName: string,
        text: string,
    ) {
        ctx.save();
        ctx.font = `${fontSize} ${fontName}`;
        ctx.fillStyle = color;
        ctx.textAlign = textAlign;
        ctx.textBaseline = baseLine;
        ctx.fillText(text, position.x, position.y);
        ctx.restore();
    };

    ectx.drawEmojiCentered = function drawEmojiCentered(
        sizePx: number,
        centerPos: Vec2,
        symbol: string,
    ) {
        ectx.fillTextExtended(
            centerPos,
            "center",
            "middle",
            "#fff",
            `${sizePx}px`,
            fontService.names.appleEmoji,
            symbol,
        );
    };

    ectx.drawImageEx = function drawImageEx(pos: Vec2, size: Vec2, image: Image) {
        ctx.drawImage(image, pos.x, pos.y, size.x, size.y);
    };

    return ectx;
}
