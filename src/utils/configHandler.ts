import * as fs from "node:fs";
import * as path from "node:path";

import log from "../utils/logger.js";
import type { Config } from "../types.js";

const packageFile = JSON.parse(
    fs.readFileSync(path.resolve("package.json"), "utf-8"),
);
const configPath = path.resolve("config.json");

export const getConfig = () => {
    if (!fs.existsSync(configPath)) {
        log.error(
            "Config does not exist! Make sure you copy config.template.json and paste it as 'config.json'. Then configure it.",
        );
        process.exit(1);
    }

    let jsonString;
    try {
        jsonString = fs.readFileSync(configPath, "utf8");
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
};
