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
