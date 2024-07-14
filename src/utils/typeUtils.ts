/**
 * This function is not needed during runtime. Its purpose is to tell the compiler that _some_ branches should never be hit.
 * For example, you can ensure that a switch statement has a case for all possible values.
 */
export function assertNever(_v: never): never {
    throw new Error("This code should not be reached.");
}

/**
 * Removes the TSuffix from entries in the config on type-level
 *
 * RemoveSuffix<"lol_id", "_id"> will map to "lol"
 * RemoveSuffix<"lol", "_id"> will map to never
 */
export type RemoveSuffix<
    TString extends string,
    TSuffix extends string,
> = TString extends `${infer T}${TSuffix}` ? T : never;

export function removeSuffix<T extends string, TSuffix extends string>(
    value: T,
    suffix: TSuffix,
): RemoveSuffix<T, TSuffix> {
    if (!value.endsWith(suffix)) {
        throw new Error(`Expected "${value}" to end with "${suffix}"`);
    }
    return value.slice(0, 0 - suffix.length) as RemoveSuffix<T, TSuffix>;
}
