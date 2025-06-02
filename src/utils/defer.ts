export default function defer(fn: () => void | Promise<void>): AsyncDisposable {
    return {
        async [Symbol.asyncDispose]() {
            await fn();
        },
    };
}
