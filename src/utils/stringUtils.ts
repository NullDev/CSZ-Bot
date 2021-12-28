/**
 * Count words in string
 * @param str string
 * @returns number of words
 */
export function countWords(str: string): number {
    return str.split(" ").filter(s => s.trim().length > 0).length;
}

/**
 * Get a substring after the first occurence of s
 * @param str string to search in
 * @param s search
 * @returns substring (untrimmed!)
 */
export function substringAfter(str: string, s: string): string{
    return str.substring(str.indexOf(s) + s.length);
}
