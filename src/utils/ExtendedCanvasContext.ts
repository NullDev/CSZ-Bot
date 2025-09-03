import type { SKRSContext2D } from "@napi-rs/canvas";

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
}

export type VerticalAlign = "top" | "middle" | "bottom";
export type HorizontalAlign = "left" | "center" | "right";

export function extendContext(ctx: SKRSContext2D): ExtendedCanvasContext {
    (ctx as ExtendedCanvasContext).circlePath = function circlePath(
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

    (ctx as ExtendedCanvasContext).fillTextExtended = function fillTextExtended(
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

    return ctx as ExtendedCanvasContext;
}
