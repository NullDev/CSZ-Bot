export function chunkArray<T>(array: readonly T[], chunkSize: number): T[][] {
    const result = [];

    for (let index = 0; index < array.length; index += chunkSize) {
        const chunk = array.slice(index, index + chunkSize);
        result.push(chunk);
    }

    return result;
}

export function randomEntry<T>(array: readonly T[]): T {
    return array[(array.length * Math.random()) | 0];
}

export type WeightedElement = {
    weight: number;
};

export function randomEntryWeighted<T extends WeightedElement>(
    array: readonly Readonly<T>[],
): T {
    const prefixSum = new Array(array.length);
    let cumulativeSum = 0;
    for (let i = 0; i < array.length; ++i) {
        cumulativeSum += array[i].weight;
        prefixSum[i] = cumulativeSum;
    }

    const offset = Math.random() * cumulativeSum;

    for (const element of array) {
        if (element.weight > offset) {
            return element;
        }
    }
    throw new Error("This should never happen (if you see this, good luck)");
}
