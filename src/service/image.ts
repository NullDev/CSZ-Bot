import { createCanvas, loadImage } from "@napi-rs/canvas";

/** @returns Buffer containing a PNG */
export async function clampImageSizeByWidth(buffer: Buffer, maxWidth: number) {
    const largeImage = await loadImage(buffer);

    const width = Math.min(maxWidth, largeImage.width);
    const canvas = createCanvas(width, (width / largeImage.width) * largeImage.height);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(largeImage, 0, 0, canvas.width, canvas.height);

    return await canvas.encode("png");
}
