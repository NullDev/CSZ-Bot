import { styleText } from "node:util";

export function highlight(s: string): string {
    return styleText("bgCyan", styleText("whiteBright", s));
}
export function highlightError(s: string) {
    return styleText("bgRed", styleText("whiteBright", s));
}
export function highlightWarn(s: string) {
    return styleText("bgYellow", styleText("black", s));
}
