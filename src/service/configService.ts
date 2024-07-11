import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import type { Config } from "../types.js";
import log from "@log";

const configPath = path.resolve("config.json");

export async function readConfig() {
    if (!(await fs.exists(configPath))) {
        log.error(
            "Config does not exist. Copy the config template and configure it according to the README:",
        );
        log.error("cp config.template.json config.json");
        log.error("code config.json");
        process.exit(1);
    }

    let jsonString: string;
    try {
        jsonString = await fs.readFile(configPath, "utf8");
    } catch (e) {
        log.error(e, "Cannot read config file");
        process.exit(1);
    }

    try {
        return JSON.parse(jsonString) as Config;
    } catch (e) {
        log.error(e, "Config is not valid JSON. Stopping...");
        return process.exit(1);
    }
}

export const databasePath = process.env.DATABASE_PATH ?? path.resolve("storage.db");

export const args = parseArgs({
    options: {
        "dry-run": {
            type: "boolean",
            description: "Run the bot in dry-run mode",
        },
    },
});
