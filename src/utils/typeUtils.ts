
/**
 * This function is not needed during runtime. Its purpose is to tell the compiler that _some_ branches should never be hit.
 * For example, you can ensure that a switch statement has a case for all possible values.
 */
export function assertNever(v: never): never {
    throw new Error("This code should not be reached.");
}
