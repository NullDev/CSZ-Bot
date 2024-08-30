import scheduleCron, { type CronOptions } from "croner";

import type { BotContext } from "@/context.js";
import { rerollNicknames } from "@/service/nickNameRoll.js";
import { connectAndPlaySaufen } from "@/handler/voiceHandler.js";
import { reminderHandler } from "@/commands/erinnerung.js";
import { endAprilFools, startAprilFools } from "@/service/aprilFools.js";
import { woisVoteScheduler } from "@/commands/woisvote.js";
import { publishAocLeaderBoard } from "@/commands/aoc.js";
import { rotate } from "@/service/banner.js";
import { leetTask } from "@/service/purge.js";
import { processBans } from "@/service/ban.js";
import { runDropAttempt } from "@/service/loot.js";
import { clearWoisLogTask } from "@/service/voiceState.js";
import { checkBirthdays } from "@/service/birthday.js";
import { handleFadingMessages } from "@/service/fadingMessage.js";
import { checkExpiredShifts } from "@/service/lootRoles.js";
import { getTrichterUnserEmbed } from "@/service/trichterUnser.js";

import * as poll from "@/commands/poll.js";
import * as ehre from "@/storage/ehre.js";

const options = {
    timezone: "Europe/Berlin",
} satisfies CronOptions;

const cron = (pattern: string, callback: Parameters<typeof scheduleCron>[1]) => {
    scheduleCron(pattern, options, callback);
};

export async function schedule(context: BotContext) {
    cron("1 0 * * *", () => checkBirthdays(context));
    cron("0 20 1-25 12 *", () => publishAocLeaderBoard(context));
    cron("0 0 * * 0", () => rerollNicknames(context));
    cron("9 0-23 * * FRI-SUN", () => connectAndPlaySaufen(context));
    cron("* * * * *", () => reminderHandler(context));
    cron("* * * * *", () => woisVoteScheduler(context));
    cron("* * * * *", () => processBans(context));
    cron("1 0 * * *", () => ehre.runDeflation());
    cron("1 0 * * *", () => ehre.resetVotes());
    cron("0 0 1 */2 *", () => rotate(context));
    cron("37 13 * * *", () => leetTask(context));
    cron("5 * * * *", () => clearWoisLogTask());
    cron("* * * * * *", () => handleFadingMessages(context));
    cron("*/15 * * * *", () => checkExpiredShifts(context));
    cron("0 20 * * FRI", () => getTrichterUnserEmbed(context));

    const loot = context.commandConfig.loot;
    if (loot.enabled) {
        cron(loot.scheduleCron, () => runDropAttempt(context));
    }

    cron("2022-04-01T00:00:00", () => startAprilFools(context));
    cron("2022-04-02T00:00:00", () => endAprilFools(context));

    await poll.importPolls();
    cron("* * * * *", () => poll.processPolls(context));
}
