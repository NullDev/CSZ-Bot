import type { BotContext } from "@/context.js";

import * as time from "@/utils/time.js";
import * as lootService from "@/service/loot.js";
import { LootAttributeKindId, LootKindId, resolveLootTemplate } from "@/service/lootData.js";
import log from "@log";
import { randomEntry } from "@/service/random.js";
import { type Snowflake, userMention } from "discord.js";

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

export async function runHalfLife(context: BotContext) {
    log.info("Running half life");

    const allWaste = await lootService.getLootsByKindId(LootKindId.RADIOACTIVE_WASTE);

    // See: https://github.com/NullDev/CSZ-Bot/issues/470
    // We don't do /2 straigt away, so we can roll this out more slowly initially. We can increase this to 2 once we got this number down in general
    // Also, consider aligning this with the drop rate of radioactive waste, so we have that balanced
    const targetWasteCount = Math.ceil(allWaste.length / 1.1);

    if (targetWasteCount >= allWaste.length) {
        return;
    }

    const wasteToRemove = allWaste.sort((a, b) => Math.random()).slice(targetWasteCount);
    if (wasteToRemove.length === 0) {
        return;
    }

    const leadTemplate = resolveLootTemplate(LootKindId.BLEI);
    if (!leadTemplate) {
        log.error("Could not resolve loot template for lead.");
        return;
    }

    const replacedStats = new Map<Snowflake, number>();

    for (const l of wasteToRemove) {
        const replaced = await lootService.replaceLoot(
            l.id,
            {
                displayName: leadTemplate.displayName,
                description: leadTemplate.infoDescription ?? leadTemplate.dropDescription,
                lootKindId: leadTemplate.id,
                usedImage: leadTemplate.asset,
                winnerId: l.winnerId,
                claimedAt: l.claimedAt,
                guildId: l.guildId,
                channelId: l.channelId,
                messageId: l.messageId,
                origin: "replacement",
            },
            true,
        );

        replacedStats.set(replaced.winnerId, replacedStats.getOrInsert(replaced.winnerId, 0) + 1);
    }

    const listFormatter = new Intl.ListFormat("de", {
        style: "short",
        type: "conjunction",
    });

    const decayStats = replacedStats
        .entries()
        .toArray()
        .map(([user, count]) => `${count}x von <@${user}>`);

    await context.textChannels.hauptchat.send({
        embeds: [
            {
                description: `:radioactive: Der Müll ${decayStats.length === 1 ? "eines Users" : "einiger User"} ist zu einem Stück Blei zerfallen: ${listFormatter.format(decayStats)}. :radioactive:`,
            },
        ],
    });
}
