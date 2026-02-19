import { ContainerBuilder, MessageFlags, type Snowflake, userMention } from "discord.js";

import type { BotContext } from "#/context.ts";
import * as time from "#/utils/time.ts";
import * as lootService from "#/service/loot.ts";
import { LootAttributeKind, LootKind, resolveLootTemplate } from "#/service/lootData.ts";
import log from "#log";
import { randomEntry } from "#/service/random.ts";

export async function degradeItems(_context: BotContext) {
    log.info("Degrading loot items");

    const now = Date.now();
    const maxKebabAge = time.days(3);
    const kebabs = await lootService.getLootsByKindId(LootKind.DOENER);

    for (const k of kebabs) {
        const itemAge = now - new Date(k.claimedAt).getTime();
        if (itemAge <= maxKebabAge) {
            continue;
        }

        const fridges = await lootService.getUserLootsByTypeId(k.winnerId, LootKind.KUEHLSCHRANK);

        if (fridges.length > 0) {
            // user has a fridge, don't verschimmel döner
            continue;
        }

        await lootService.replaceLoot(
            k.id,
            {
                displayName: "Verschimmelter Döner",
                lootKindId: LootKind.VERSCHIMMELTER_DOENER,
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
    const sweets = await lootService.getLootsWithAttribute(LootAttributeKind.SWEET);

    const targetLoot = randomEntry(sweets);
    if (!targetLoot) {
        return;
    }

    const wasteItems = await lootService.getUserLootsByTypeId(
        targetLoot.winnerId,
        LootKind.RADIOACTIVE_WASTE,
    );
    if (wasteItems.length === 0) {
        return;
    }

    const attributeAdded = await lootService.addLootAttributeIfNotPresent(
        targetLoot.id,
        LootAttributeKind.RADIOACTIVE,
    );
    if (!attributeAdded) {
        return;
    }

    await context.textChannels.hauptchat.send({
        components: [
            new ContainerBuilder().addTextDisplayComponents(
                t =>
                    t.setContent(
                        `:radioactive: ${targetLoot.displayName} von ${userMention(targetLoot.winnerId)} wurde verstrahlt. :radioactive:`,
                    ),
                t => t.setContent("-# Du solltest deinen Müll besser entsorgen"),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
    });
}

export async function runHalfLife(context: BotContext) {
    const logger = log.child({}, { msgPrefix: "[runHalfLife] " });

    logger.info("Running half life");

    const allWaste = await lootService.getLootsByKindId(LootKind.RADIOACTIVE_WASTE);

    // See: https://github.com/NullDev/CSZ-Bot/issues/470
    const targetWasteCount = Math.ceil(allWaste.length / 2);
    logger.info({ targetWasteCount }, "targetWasteCount");

    if (targetWasteCount >= allWaste.length) {
        logger.info("targetWasteCount >= allWaste.length, nothing to do");
        return;
    }

    const wasteToRemove = allWaste.sort(() => Math.random()).slice(targetWasteCount);
    if (wasteToRemove.length === 0) {
        logger.info("No waste to remove, nothing to do");
        return;
    }

    const leadTemplate = resolveLootTemplate(LootKind.BLEI);
    if (!leadTemplate) {
        logger.error("Could not resolve loot template for lead.");
        return;
    }

    const replacedStats = new Map<Snowflake, number>();

    for (const l of wasteToRemove) {
        logger.info({ lootId: l.id, winnerId: l.winnerId }, "Replacing loot");
        const replaced = await lootService.replaceLoot(
            l.id,
            {
                displayName: leadTemplate.displayName,
                lootKindId: leadTemplate.id,
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

    logger.info({ replacedStats }, "replacedStats");

    const components: ContainerBuilder[] = [];
    for (const [user, count] of replacedStats.entries()) {
        components.push(
            new ContainerBuilder().addTextDisplayComponents(t =>
                t.setContent(
                    `:radioactive: ${count}x Müll von ${userMention(user)} ist zu einem Stück Blei zerfallen. :radioactive:`,
                ),
            ),
        );
    }

    await context.textChannels.hauptchat.send({
        flags: MessageFlags.IsComponentsV2,
        components: components,
        allowedMentions: {
            users: replacedStats.keys().toArray(),
        },
    });
}
