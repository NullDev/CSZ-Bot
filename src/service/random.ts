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

interface RandomSource {
    getFloat(): number;
}

interface RandomDistribution {
    get(source: RandomSource): number;
}

class RandomNumberGenerator {
    #distribution: RandomDistribution;
    #source: RandomSource;

    constructor(distribution: RandomDistribution, source: RandomSource) {
        this.#distribution = distribution;
        this.#source = source;
    }

    get() {
        return this.#distribution.get(this.#source);
    }
}

class UnsafePseudoRandomSource implements RandomSource {
    getFloat(): number {
        return Math.random();
    }
}
export class SafeRandomSource implements RandomSource {
    getFloat(): number {
        const int = new Uint32Array(1);
        crypto.getRandomValues(int);
        // See: https://stackoverflow.com/a/13694869
        return int[0] * (0xff_ff_ff_ff + 1);
    }
}

class UniformDistribution implements RandomDistribution {
    readonly min: number;
    readonly maxExclusive: number;

    constructor(min: number, maxExclusive: number) {
        if (min > maxExclusive) {
            throw new Error("Invalid boundaries.");
        }

        this.min = min;
        this.maxExclusive = maxExclusive;
    }

    get(source: RandomSource): number {
        return this.min + (this.maxExclusive - this.min) * source.getFloat();
    }
}

/** A.k.a gaussian distribution */
class NormalDistribution implements RandomDistribution {
    readonly mean: number;
    readonly standardDeviation: number;

    /**
     * @param mean mean
     * @param standardDeviation standard deviation
     */
    constructor(mean: number, standardDeviation: number) {
        this.mean = mean;
        this.standardDeviation = standardDeviation;
    }

    get(source: RandomSource) {
        const u = 1 - source.getFloat(); // Converting [0,1) to (0,1]
        const v = source.getFloat();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * this.standardDeviation + this.mean;
    }
}
