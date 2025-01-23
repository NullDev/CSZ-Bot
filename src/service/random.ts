export interface Range {
    min: number;
    max: number;
}

export function randomValue(range: Range): number {
    return Math.round(range.min + Math.random() * (range.max - range.min));
}
