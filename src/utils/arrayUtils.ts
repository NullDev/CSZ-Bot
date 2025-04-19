export function chunkArray<T>(array: readonly T[], chunkSize: number): T[][] {
    const result = [];

    for (let index = 0; index < array.length; index += chunkSize) {
        const chunk = array.slice(index, index + chunkSize);
        result.push(chunk);
    }

    return result;
}

export function shuffleArray<T>(array: readonly T[], biasFn: (item: T) => number): T[] {
    return array
        .map((value, _idx) => ({ value, bias: biasFn(value) }))
        .sort((a, b) => a.bias - b.bias)
        .map(({ value }) => value);
}
