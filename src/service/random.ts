export type Range = ExclusiveRange | InclusiveRange;

/**
 * [min, ceil(maxExclusive))
 */
export interface ExclusiveRange {
    min: number;
    maxExclusive: number;
}

/**
 * [min, ceil(maxInclusive)]
 */
export interface InclusiveRange {
    min: number;
    maxInclusive: number;
}

/**
 * Based on https://stackoverflow.com/a/24152886
 */
export function randomValue(range: Range): number {
    const upperLimit = "maxInclusive" in range ? range.maxInclusive + 1 : range.maxExclusive;
    return Math.round(range.min + Math.random() * (upperLimit - range.min));
}
