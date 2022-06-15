// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as fs from "fs";
import * as path from "path";
import type { Config } from "../types";

import log from "../utils/logger";

const packageFile = require(path.resolve("package.json"));
const configPath = path.resolve("config.json");

export const getConfig = () => {
    if (!fs.existsSync(configPath)) {
        log.error("Config does not exist! Make sure you copy config.template.json and paste it as 'config.json'. Then configure it.");
        process.exit(1);
    }

    let jsonString;
    try {
        jsonString = fs.readFileSync(configPath, "utf8");
    }
    catch (e) {
        log.error("Cannot read config file:", e);
        process.exit(1);
    }

    try {
        return JSON.parse(jsonString) as Config;
    }
    catch (e) {
        log.error("Config is not valid JSON. Stopping...", e);
        return process.exit(1);
    }
};

export const getVersion = () => packageFile.version;
export const getName = () => packageFile.name;
export const getAuthor = () => packageFile.author;
export const getDescription = () => packageFile.description;
