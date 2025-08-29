import type { BotContext } from "src/context.js";

import type { Loot } from "src/storage/db/model.js";
import log from "@log";
import * as time from "@/utils/time.js";
import * as lootService from "@/service/loot.js";
import { LootKindId } from "./lootData.js";
import * as randomService from "./random.js";

export async function hatchEggs(context: BotContext) {
    log.info("Checking egg hatching");

    const now = Date.now();
    const maxEggAge = time.days(30);
    const eggs = await lootService.getLootsByKindId(LootKindId.EI);

    for (const e of eggs) {
        const itemAge = now - new Date(e.claimedAt).getTime();
        if (itemAge <= maxEggAge) {
            continue;
        }

        if (!randomService.randomBoolean(0.25)) {
            continue;
        }

        await hatchEgg(context, e);
    }
}

async function hatchEgg(context: BotContext, egg: Loot) {
    console.assert(egg.lootKindId === LootKindId.EI, "Can only hatch eggs");
}
