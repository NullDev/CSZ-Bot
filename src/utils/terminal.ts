import { styleText } from "node:util";

// TODO: Remove when node typings are updated (this would be around Node.js 22)
declare module "node:util" {
    function styleText(style: string, text: string): string;
}

export function highlight(s: string): string {
    return styleText("bgCyan", styleText("whiteBright", s));
}
export function highlightError(s: string) {
    return styleText("bgRed", styleText("whiteBright", s));
}
export function highlightWarn(s: string) {
    return styleText("bgYellow", styleText("black", s));
}
