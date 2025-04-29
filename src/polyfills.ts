declare global {
    // type polyfill for Math.sumPrecise (currently in stage 2):
    // https://github.com/tc39/proposal-math-sum
    // Remove this as soon as it is stable
    interface Math {
        sumPrecise: (values: number[]) => number;
    }

    // https://github.com/tc39/proposal-upsert
    interface Map<K, V> {
        getOrInsert(key: K, defaultValue: V): V;
        getOrInsertComputed<TK extends K>(key: TK, callbackFunction: (key: TK) => V): V;
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

// https://github.com/tc39/proposal-upsert
if (typeof Map.prototype.getOrInsert === "undefined") {
    Map.prototype.getOrInsert = function (key, defaultValue) {
        if (!this.has(key)) {
            this.set(key, defaultValue);
        }
        return this.get(key);
    };
}
if (typeof Map.prototype.getOrInsertComputed === "undefined") {
    Map.prototype.getOrInsertComputed = function (key, callbackFunction) {
        if (!this.has(key)) {
            this.set(key, callbackFunction(key));
        }
        return this.get(key);
    };
}
