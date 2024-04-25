// type polyfill for Math.sumPrecise (currently in stage 2):
// https://github.com/tc39/proposal-math-sum
// Remove this as soon as it is stable
declare global {
    interface Math {
        sumPrecise: (values: number[]) => number;
    }
}

if (typeof Math.sumPrecise !== "function") {
    // intentionally very cheap implementation. But does the thing.
    Math.sumPrecise = (values: number[]) => values.reduce((a, b) => a + b, 0);
}

// @ts-ignore: Property "UrlPattern" does not exist
if (!globalThis.URLPattern) {
    await import("urlpattern-polyfill");
}
