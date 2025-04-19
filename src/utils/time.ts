/** @returns The amount of time in milliseconds */
export function seconds(n: number): number {
    return n * 1000;
}

/** @returns The amount of time in milliseconds */
export function minutes(n: number): number {
    return seconds(n * 60);
}

/** @returns The amount of time in milliseconds */
export function hours(n: number): number {
    return minutes(n * 60);
}

/** @returns The amount of time in milliseconds */
export function days(n: number): number {
    return hours(n * 24);
}
