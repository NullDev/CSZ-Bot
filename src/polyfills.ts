// type polyfill for Math.sumPrecise (currently in stage 2):
// https://github.com/tc39/proposal-math-sum
// Remove this as soon as it is stable
declare global {
    interface Math {
        sumPrecise: (values: number[]) => number;
    }

    /*
    // TODO: https://github.com/tc39/proposal-iterator-helpers/
    interface Iterator<T, TReturn = any, TNext = undefined> {
        map<U>(mapperFn: (value: T) => U): Iterator<T, TReturn, TNext>;
        filter<S extends T>(filtererFn: (value: T) => value is S): Iterator<S, TReturn, TNext>;
        take(limit: number): Iterator<T, TReturn, TNext>;
        drop(limit: number): Iterator<T, TReturn, TNext>;
        // flatMap
        // reduce
        toArray(): T[];
        forEach(fn: (value: T) => unknown): void;
    }
    */
}

if (typeof Math.sumPrecise !== "function") {
    // intentionally very cheap implementation. But does the thing.
    Math.sumPrecise = (values: number[]) => values.reduce((a, b) => a + b, 0);
}

// @ts-ignore: Property "UrlPattern" does not exist
if (!globalThis.URLPattern) {
    await import("urlpattern-polyfill");
}
