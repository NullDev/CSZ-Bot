// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as fs from "fs";
import * as path from "path";
import { Config } from "../types";

import * as log from "../utils/logger";

const packagefile = require(path.resolve("package.json"));
const configPath = path.resolve("config.json");

const isValidJson = (obj: any): Boolean => {
    try {
        JSON.parse(obj);
    }
    catch (e) {
        return false;
    }
    return true;
};

export const getConfig = function(): Config {
    if (!fs.existsSync(configPath)) {
        log.error("Config does not exist! Make sure you copy config.template.json and paste it as 'config.json'. Then configure it.");
        process.exit(1);
    }

    let jsondata = "";
    try {
        jsondata = fs.readFileSync(configPath, "utf8");
    }
    catch (e) {
        log.error(`Cannot read config file: ${e}`);
        process.exit(1);
    }

    if (isValidJson(jsondata)) return JSON.parse(jsondata);

    log.error("Config is not valid JSON. Stopping...");
    return process.exit(1);
};

export const getVersion = (): string => {
    return packagefile.version;
};

export const getName = (): string => {
    return packagefile.name;
};

export const getAuthor = (): string => {
    return packagefile.author;
};

export const getDescription = (): string => {
    return packagefile.description;
};
