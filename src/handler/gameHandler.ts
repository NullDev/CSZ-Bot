import log from "../utils/logger";
import {getConfig} from "../utils/configHandler";
import {ban} from "../commands/modcommands/ban";
import * as discord from "discord.js";
import {Presence} from "discord.js";
import {Config} from "../types";
const config = getConfig();

/**
 * Handles Game changes
 *
 * @class GameHandler
 */
export default class GameHandler {
    config: Config;
    timeouts: Map<string, NodeJS.Timeout>;

    /**
     * Creates an instance of GameHandler.
     * @memberof GameHandler
     */
    constructor(private readonly client: discord.Client) {
        this.config = config;
        this.client = client;
        this.timeouts = new Map<string, NodeJS.Timeout>();
    }

    // TODO: Add increase of ban time
    onPresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
        let {names, threshold} = config.bot_settings.forbidden_games;

        let currTimeout = this.timeouts.get(newPresence.userId);
        if (newPresence.activities.length === 0) {
            if (currTimeout) {
                clearTimeout(currTimeout);
                this.timeouts.delete(newPresence.userId);
            }
            return;
        }
        let activityName = newPresence.activities[0].name.toLowerCase();
        log.debug(`User ${newPresence.user?.id} now playing ${activityName}`);

        let isForbidden = names.find(s => s === activityName);
        if (isForbidden && !currTimeout) {
            let timeout = setTimeout(() => {
                ban(this.client, newPresence.member!, newPresence.user!, "Verbotene Spiele", false, 0.10);
                this.timeouts.delete(newPresence.userId);
            }, threshold * 60 * 1000);
            this.timeouts.set(newPresence.userId, timeout);
            return;
        }

        if (!isForbidden && currTimeout) {
            clearTimeout(currTimeout);
            this.timeouts.delete(newPresence.userId);
        }
    }
}
