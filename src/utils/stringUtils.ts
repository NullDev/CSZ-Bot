/**
 * Count words in string
 * @param str string
 * @returns number of words
 */
const countWords = (str: string): number => str.split(" ").filter(s => s.trim().length > 0).length;

/**
 * Get a substring after the first occurence of s
 * @param str string to search in
 * @param s search
 * @returns substring (untrimmed!)
 */
const substringAfter = (str: string, s: string): string => str.substring(str.indexOf(s) + s.length);
