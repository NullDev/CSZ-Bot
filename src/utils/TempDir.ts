import * as fs from "node:fs/promises";

export default class TempDir {
    readonly path: string;
    private constructor(path: string) {
        this.path = path;
    }

    static async create(prefix: string): Promise<TempDir> {
        await fs.mkdtemp(prefix);
        return new TempDir(prefix);
    }

    async [Symbol.asyncDispose]() {
        await fs.rmdir(this.path, { recursive: true });
    }
}
