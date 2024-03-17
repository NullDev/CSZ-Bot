const color = {
    whiteBright: (s: string) => `\u001B[97m${s}\u001B[39m`,
    bgRed: (s: string) => `\u001B[41m${s}\u001B[49m`,
    bgYellow: (s: string) => `\u001B[43m${s}\u001B[49m`,
    bgCyan: (s: string) => `\u001B[46m${s}\u001B[49m`,
    black: (s: string) => `\u001B[30m${s}\u001B[39m`,
};

export function highlight(s: string): string {
    return color.bgCyan(color.whiteBright(s));
}
export function highlightError(s: string) {
    return color.whiteBright(color.bgRed(s));
}
export function highlightWarn(s: string) {
    return color.black(color.bgYellow(s));
}
