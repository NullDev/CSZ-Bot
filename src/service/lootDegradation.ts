import type { BotContext } from "@/context.js";

import * as time from "@/utils/time.js";
import * as lootService from "@/service/loot.js";
import log from "@log";

export async function degradeItems(_context: BotContext) {
    log.info("Degrading loot items");

    const now = Date.now();
    const maxKebabAge = time.days(3);
    const kebabs = await lootService.getLootsByKindId(lootService.LootTypeId.DOENER);

    for (const k of kebabs) {
        const itemAge = now - new Date(k.claimedAt).getTime();
        if (itemAge <= maxKebabAge) {
            continue;
        }

        await lootService.replaceLoot(
            k.id,
            {
                displayName: "Verschimmelter Döner",
                description: "Du hättest ihn früher essen sollen",
                lootKindId: lootService.LootTypeId.VERSCHIMMELTER_DOENER,
                usedImage: null,
                winnerId: k.winnerId,
                claimedAt: k.claimedAt,
                guildId: k.guildId,
                channelId: k.channelId,
                messageId: k.messageId,
            },
            true,
        );
    }
}
