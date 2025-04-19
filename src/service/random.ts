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
    const upperLimit = "maxInclusive" in range ? range.maxInclusive : range.maxExclusive - 1;
    return Math.round(range.min + Math.random() * (upperLimit - range.min));
}

export function randomEntry<T>(array: readonly T[]): T {
    return array[(array.length * Math.random()) | 0];
}

export function randomEntryWeighted<T>(
    array: readonly Readonly<T>[],
    weights: readonly number[],
): Readonly<T> {
    if (array.length === 0) {
        throw new Error("Cannot select random entry from empty array");
    }
    if (array.length !== weights.length) {
        throw new Error("Array and weights must have the same length");
    }

    const prefixSum = [0];
    for (let i = 0; i < weights.length; ++i) {
        prefixSum[i] = weights[i] + (prefixSum[i - 1] ?? 0);
    }

    const offset = Math.random() * prefixSum[prefixSum.length - 1];

    for (let i = 0; i < array.length; ++i) {
        if (prefixSum[i] > offset && weights[i] > 0) {
            return array[i];
        }
    }

    for (let i = weights.length - 1; i >= 0; --i) {
        if (weights[i] > 0) {
            return array[i];
        }
    }

    throw new Error("No valid entry found");
}
