import { Cron, type CronOptions } from "croner";

import type { BotContext } from "#/context.ts";
import { rerollNicknames } from "#/service/nickNameRoll.ts";
import { connectAndPlaySaufen } from "#/handler/voiceHandler.ts";
import { reminderHandler } from "#/commands/erinnerung.ts";
import { endAprilFools, startAprilFools } from "#/service/aprilFools.ts";
import { woisVoteScheduler } from "#/commands/woisvote.ts";
import { publishAocLeaderBoard } from "#/commands/aoc.ts";
import { rotate } from "#/service/banner.ts";
import { leetTask } from "#/service/purge.ts";
import { processBans } from "#/service/ban.ts";
import { runDropAttempt } from "#/service/lootDrop.ts";
import { clearWoisLogTask } from "#/service/voiceState.ts";
import { checkBirthdays } from "#/service/birthday.ts";
import { handleFadingMessages } from "#/service/fadingMessage.ts";
import { checkExpiredShifts } from "#/service/lootRoles.ts";
import { sendTrichterUnser } from "#/service/trichterUnser.ts";
import { degradeItems, exposeWithRadiation, runHalfLife } from "#/service/lootDegradation.ts";
import { hatchEggs } from "#/service/hatching.ts";

import * as pollLegacy from "#/service/delayedPollLegacy.ts";
import * as ehre from "#/storage/ehre.ts";

const options = {
    timezone: "Europe/Berlin",
} satisfies CronOptions;

const cron = (pattern: string, callback: ConstructorParameters<typeof Cron>[1]) => {
    new Cron(pattern, options, callback);
};

export async function schedule(context: BotContext) {
    cron("1 0 * * *", () => checkBirthdays(context));
    cron("0 20 1-12 12 *", () => publishAocLeaderBoard(context));
    cron("0 0 * * 0", () => rerollNicknames(context));
    cron("36 0-23 * * FRI-SUN", () => connectAndPlaySaufen(context));
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
    cron("0 20 * * FRI", () => sendTrichterUnser(context));
    cron("0 * * * *", () => degradeItems(context));
    cron("26 * * * *", () => hatchEggs(context));
    cron("26 18,19 * * *", () => exposeWithRadiation(context));
    cron("15 18 * * *", () => runHalfLife(context));

    const loot = context.commandConfig.loot;
    if (loot.enabled) {
        cron(loot.scheduleCron, () => runDropAttempt(context));
    }

    cron("2025-04-01T00:00:00", () => startAprilFools(context));
    cron("2025-04-02T00:00:00", () => endAprilFools(context));

    await pollLegacy.importPolls();
    cron("* * * * *", () => pollLegacy.processPolls(context));
}
