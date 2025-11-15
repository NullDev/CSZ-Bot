import * as fs from "node:fs/promises";

import { userMention } from "discord.js";

import type { BotContext } from "#context.ts";
import type { Loot } from "#storage/db/model.ts";
import log from "#log";
import * as time from "#utils/time.ts";
import * as lootService from "#service/loot.ts";
import { LootKindId, resolveLootTemplate } from "./lootData.ts";
import * as randomService from "./random.ts";

export async function hatchEggs(context: BotContext) {
    log.info("Checking egg hatching");

    const now = Date.now();
    const maxEggAge = time.days(30);
    const eggs = await lootService.getLootsByKindId(LootKindId.EI);

    for (const e of eggs) {
        const itemAge = now - new Date(e.claimedAt).getTime();
        if (itemAge <= maxEggAge) {
            log.debug(`Egg ${e.id} is not old enough to hatch yet (${itemAge} < ${maxEggAge})`);
            continue;
        }

        if (!randomService.randomBoolean(0.1)) {
            log.debug(`Egg ${e.id} not hatching this time`);
            continue;
        }

        await hatchEgg(context, e);
    }
}

async function hatchEgg(context: BotContext, egg: Loot) {
    console.assert(egg.lootKindId === LootKindId.EI, "Can only hatch eggs");

    const hatchCandidates = [
        LootKindId.KADSE,
        LootKindId.BIBER,
        LootKindId.FERRIS,
        LootKindId.OETTINGER,
        LootKindId.THUNFISCHSHAKE,
        LootKindId.EI,
    ];
    const hatchWeights = [10, 10, 10, 1, 1, 5];

    const animalKindId = randomService.randomEntryWeighted(hatchCandidates, hatchWeights);

    const animal = resolveLootTemplate(animalKindId);
    if (!animal) {
        throw new Error("Failed to resolve hatched animal loot template");
    }

    await lootService.replaceLoot(
        egg.id,
        {
            displayName: animal.displayName,
            lootKindId: animal.id,
            winnerId: egg.winnerId,
            claimedAt: egg.claimedAt,
            guildId: egg.guildId,
            channelId: egg.channelId,
            messageId: egg.messageId,
            origin: "replacement",
        },
        true,
    );

    const attachment = animal.asset ? await fs.readFile(animal.asset) : null;

    await context.textChannels.hauptchat.send({
        embeds: [
            {
                title: "Ein Ei ist geschlüpft!",
                description: `${userMention(egg.winnerId)} hat ein Ei ausgebrütet und ein **${animal.displayName}** bekommen! Wow!`,
                image: attachment
                    ? {
                          url: "attachment://opened.gif",
                      }
                    : undefined,
            },
        ],
        allowedMentions: {
            users: [egg.winnerId],
        },
    });
}
