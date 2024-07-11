import { MessageFormat } from "messageformat";

/**
 * Count words in string
 * @param str string
 * @returns number of words
 */
export function countWords(str: string): number {
    return str.split(" ").filter(s => s.trim().length > 0).length;
}

/**
 * Get a substring after the first occurrence of s
 * @param str string to search in
 * @param s search
 * @returns substring (untrimmed!)
 */
export function substringAfter(str: string, s: string): string {
    return str.substring(str.indexOf(s) + s.length);
}

const formatCache: Record<string, MessageFormat> = {};

export function format(mf2Source: string, params: Record<string, unknown>): string {
    // biome-ignore lint/suspicious/noAssignInExpressions: dem performance
    const mf = (formatCache[mf2Source] ??= new MessageFormat(mf2Source, "de"));
    return mf.format(params);
}
