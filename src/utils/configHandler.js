// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as fs from "fs";
import * as path from "path";

import * as log from "../utils/logger";

const packagefile = require(path.resolve("package.json")); // TODO: Check if this is till working
const configPath = path.resolve("config.json");

/**
 * Check if the config is valid JSON
 *
 * @param {*} obj
 * @returns {Boolean} whether it is valid JSON
 */
let isValidJson = function(obj) {
    try {
        JSON.parse(obj);
    }
    catch (e) {
        return false;
    }
    return true;
};

/**
 * Reads out config data
 *
 * @returns {{
 *   auth: {
 *     bot_token: string,
 *     client_id: string
 *   },
 *   bot_settings: {
 *      status: string,
 *      prefix: {
 *        command_prefix: string,
 *        mod_prefix: string
 *      },
 *      moderator_roles: Array<string>,
 *      woisping_limit: number,
 *      woisping_threshold: number,
 *      quotes: {
          allowed_group_ids: Array<string>,
          anonymous_channel_ids: Array<string>,
          blacklisted_channel_ids: Array<string>,
          target_channel_ids: Array<string>,
          emoji_name: string,
        }
*    }
 *   ids: Record<string, import("discord.js").Snowflake>
 * }} JSON Content
 */
export const getConfig = function() {
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

export const getVersion = function() {
    return packagefile.version;
};

export const getName = function() {
    return packagefile.name;
};

export const getAuthor = function() {
    return packagefile.author;
};

export const getDescription = function() {
    return packagefile.description;
};

