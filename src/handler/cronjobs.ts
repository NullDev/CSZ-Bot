import cron, { type CronOptions } from "croner";

import type { BotContext } from "../context.js";
import { checkBirthdays } from "./bdayHandler.js";
import { rerollNicknames } from "./nicknameHandler.js";
import { connectAndPlaySaufen } from "./voiceHandler.js";
import { reminderHandler } from "../commands/erinnerung.js";
import { endAprilFools, startAprilFools } from "./aprilFoolsHandler.js";
import { woisVoteScheduler } from "../commands/woisvote.js";
import { publishAocLeaderBoard } from "../commands/aoc.js";
import { rotate } from "../helper/bannerCarusel.js";
import { clearWoisLogTask } from "./voiceStateUpdateHandler.js";
import { leetTask } from "./purge.js";
import { processBans } from "../service/banService.js";
import { runDropAttempt } from "../service/lootService.js";

import * as poll from "../commands/poll.js";
import * as ehre from "../storage/ehre.js";

const options = {
    timezone: "Europe/Berlin",
} satisfies CronOptions;

const schedule = (pattern: string, callback: Parameters<typeof cron>[1]) => {
    cron(pattern, options, callback);
};

export const scheduleCronjobs = async (context: BotContext) => {
    schedule("1 0 * * *", () => checkBirthdays(context));
    schedule("0 20 1-25 12 *", () => publishAocLeaderBoard(context));
    schedule("0 0 * * 0", () => rerollNicknames(context));
    schedule("36 0-23 * * FRI-SUN", () => connectAndPlaySaufen(context));
    schedule("* * * * *", () => reminderHandler(context));
    schedule("* * * * *", () => woisVoteScheduler(context));
    schedule("* * * * *", () => processBans(context));
    schedule("1 0 * * *", () => ehre.runDeflation());
    schedule("1 0 * * *", () => ehre.resetVotes());
    schedule("0 0 1 */2 *", () => rotate(context));
    schedule("37 13 * * *", () => leetTask(context));
    schedule("5 * * * *", () => clearWoisLogTask(context));

    const loot = context.commandConfig.loot;
    if (loot.enabled) {
        schedule(loot.scheduleCron, () => runDropAttempt(context));
    }

    schedule("2022-04-01T00:00:00", () => startAprilFools(context));
    schedule("2022-04-02T00:00:00", () => endAprilFools(context));

    await poll.importPolls();
    schedule("* * * * *", () => poll.processPolls(context));
};
