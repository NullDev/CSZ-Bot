import * as fs from "node:fs/promises";
import * as sentry from "@sentry/node";

import log from "#log";

export default class TempDir {
    readonly path: string;
    private constructor(path: string) {
        this.path = path;
    }

    static async create(prefix: string): Promise<TempDir> {
        const tempDir = await fs.mkdtemp(prefix);
        return new TempDir(tempDir);
    }

    /** Removes created directory if created with `await using`. */
    async [Symbol.asyncDispose]() {
        try {
            await fs.rm(this.path, { recursive: true });
        } catch (err) {
            log.error(err, "Couldn't remove directory");
            sentry.captureException(err);
        }
    }
}
