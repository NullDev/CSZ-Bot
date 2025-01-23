import type { BotContext } from "@/context.js";

import * as time from "@/utils/time.js";
import * as lootService from "@/service/loot.js";
import { LootAttributeKindId, LootKindId } from "@/service/lootData.js";
import log from "@log";
import { randomEntry } from "@/service/random.js";

export async function degradeItems(_context: BotContext) {
    log.info("Degrading loot items");

    const now = Date.now();
    const maxKebabAge = time.days(3);
    const kebabs = await lootService.getLootsByKindId(LootKindId.DOENER);

    for (const k of kebabs) {
        const itemAge = now - new Date(k.claimedAt).getTime();
        if (itemAge <= maxKebabAge) {
            continue;
        }

        const fridges = await lootService.getUserLootsByTypeId(k.winnerId, LootKindId.KUEHLSCHRANK);

        if (fridges.length > 0) {
            // user has a fridge, don't verschimmel döner
            continue;
        }

        await lootService.replaceLoot(
            k.id,
            {
                displayName: "Verschimmelter Döner",
                description: "Du hättest ihn früher essen sollen",
                lootKindId: LootKindId.VERSCHIMMELTER_DOENER,
                usedImage: null,
                winnerId: k.winnerId,
                claimedAt: k.claimedAt,
                guildId: k.guildId,
                channelId: k.channelId,
                messageId: k.messageId,
                origin: "replacement",
            },
            true,
        );
    }
}

export async function exposeWithRadiation(context: BotContext) {
    // currently also includes sweets that are already radioactive
    const sweets = await lootService.getLootsWithAttribute(LootAttributeKindId.SWEET);

    const targetLoot = randomEntry(sweets);
    if (!targetLoot) {
        return;
    }

    const wasteItems = await lootService.getUserLootsByTypeId(
        targetLoot.winnerId,
        LootKindId.RADIOACTIVE_WASTE,
    );
    if (wasteItems.length === 0) {
        return;
    }

    const attribute = await lootService.addLootAttributeIfNotPresent(
        targetLoot.id,
        LootAttributeKindId.RADIOACTIVE,
    );
    if (!attribute) {
        return;
    }

    await context.textChannels.hauptchat.send({
        embeds: [
            {
                description: `:radioactive: ${targetLoot.displayName} von <@${targetLoot.winnerId}> wurde verstrahlt. :radioactive:`,
                footer: {
                    text: "Du solltest deinen Müll besser entsorgen",
                },
            },
        ],
    });
}
