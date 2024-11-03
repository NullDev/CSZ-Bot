import * as fs from "node:fs/promises";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ComponentType,
    type TextChannel,
    type User,
    type Interaction,
    type GuildBasedChannel,
    type TextBasedChannel,
} from "discord.js";
import { Temporal } from "@js-temporal/polyfill";
import * as sentry from "@sentry/bun";

import type { BotContext } from "@/context.js";
import type { Loot, LootId } from "@/storage/db/model.js";
import { randomEntry, randomEntryWeighted } from "@/utils/arrayUtils.js";

import * as lootService from "@/service/loot.js";
import {
    LootAttributeKindId,
    lootAttributeTemplates,
    LootKindId,
    lootTemplates,
} from "@/service/lootData.js";

import log from "@log";

const lootTimeoutMs = 60 * 1000;

export async function runDropAttempt(context: BotContext) {
    const lootConfig = context.commandConfig.loot;
    const dice = Math.random();

    log.info(`Rolled dice: ${dice}, against drop chance ${lootConfig.dropChance}`);
    if (dice > lootConfig.dropChance) {
        return;
    }

    const fallbackChannel = context.textChannels.hauptchat;
    const targetChannelId = lootConfig.allowedChannelIds
        ? randomEntry(lootConfig.allowedChannelIds)
        : fallbackChannel.id;

    const targetChannel = (await context.client.channels.fetch(targetChannelId)) ?? fallbackChannel;

    if (targetChannel.type !== ChannelType.GuildText) {
        log.error(
            `Loot target channel ${targetChannelId} is not a guild+text channel, aborting drop`,
        );
        return;
    }

    const lm = targetChannel.lastMessage?.createdTimestamp;
    if (lm === undefined) {
        log.info(
            `Would have dropped loot to ${targetChannel.name}, but it does not have any messages yet`,
        );
        return;
    }

    const now = Temporal.Now.instant();
    const lastMessage = Temporal.Instant.fromEpochMilliseconds(lm);
    const passedTime = now.since(lastMessage);

    if (passedTime.subtract(lootConfig.maxTimePassedSinceLastMessage).sign > 0) {
        log.info(
            `Would have dropped loot to ${targetChannel.name}, but it was too soon since the last message (${lootConfig.maxTimePassedSinceLastMessage})`,
        );
        return;
    }

    log.info(
        `Dice was ${dice}, which is lower than configured ${lootConfig.dropChance}. Dropping loot to ${targetChannel.name}!`,
    );
    await postLootDrop(context, targetChannel, undefined, undefined);
}

export async function postLootDrop(
    context: BotContext,
    channel: GuildBasedChannel & TextBasedChannel,
    donor: User | undefined,
    predecessorLootId: LootId | undefined,
): Promise<Loot | undefined> {
    const hamster = context.guild.emojis.cache.find(e => e.name === "sad_hamster") ?? ":(";

    const takeLootButton = new ButtonBuilder()
        .setCustomId("take-loot")
        .setLabel("Geschenk nehmen")
        .setStyle(ButtonStyle.Primary);

    const timeoutSeconds = (lootTimeoutMs / 1000) | 0;
    const message = await channel.send({
        embeds: [
            {
                title: "Geschenk",
                description: donor
                    ? `${donor} hat ein Geschenk fallen lassen! Öffne es schnell, in ${timeoutSeconds} Sekunden ist es weg!`
                    : `Ein Geschenk ist aufgetaucht! Öffne es schnell, in ${timeoutSeconds} Sekunden ist es weg!`,
                image: {
                    url: "attachment://00-unopened.gif",
                },
            },
        ],
        files: [
            {
                name: "00-unopened.gif",
                attachment: await fs.readFile("assets/loot/00-unopened.gif"),
            },
        ],
        components: [{ type: ComponentType.ActionRow, components: [takeLootButton] }],
    });

    let interaction: Interaction | undefined = undefined;

    try {
        interaction = await message.awaitMessageComponent({
            filter: i => i.customId === "take-loot",
            componentType: ComponentType.Button,
            time: lootTimeoutMs,
        });
    } catch (err) {
        log.info(`Loot drop ${message.id} timed out; loot was not claimed, cleaning up`);
        const original = message.embeds[0];
        await message.edit({
            embeds: [
                {
                    ...original,
                    description: donor
                        ? `Das Geschenk von ${donor} verpuffte im nichts :(`
                        : `Oki aber nächstes mal bitti aufmachi, sonst muss ichs wieder mitnehmi ${hamster}`,
                    footer: {
                        text: "❌ Niemand war schnell genug",
                    },
                },
            ],
            files: [],
            components: [],
        });
        return;
    }

    if (donor !== undefined && interaction.user.id === donor.id) {
        await message.edit({
            content: `${interaction.user} hat versucht, das Geschenki selbst zu öffnen. Das geht aber nichti ${hamster}\nDas Geschenk macht plopp und ist weg! 🎈`,
            embeds: [],
            components: [],
        });
        return;
    }

    const defaultWeights = lootTemplates.map(t => t.weight);
    const { messages, weights } = await getDropWeightAdjustments(interaction.user, defaultWeights);

    const template = randomEntryWeighted(lootTemplates, weights);

    const rarityWeights = lootAttributeTemplates.map(a => a.initialDropWeight ?? 0);

    const initialAttribute =
        template.id === LootKindId.NICHTS
            ? null
            : randomEntryWeighted(lootAttributeTemplates, rarityWeights);

    const claimedLoot = await lootService.createLoot(
        template,
        interaction.user,
        message,
        "drop",
        predecessorLootId ?? null,
        initialAttribute,
    );

    const reply = await interaction.deferReply({ ephemeral: true });

    if (!claimedLoot) {
        await reply.edit({
            content: `Upsi, da ist was schief gelaufi oder jemand anderes war schnelli ${hamster}`,
        });
        return;
    }

    await awardPostDropLootAttributes(claimedLoot);

    await reply.delete();

    log.info(
        `User ${interaction.user.username} claimed loot ${claimedLoot.id} (template: ${template.id})`,
    );

    const winner = await context.guild.members.fetch(claimedLoot.winnerId);

    const attachment = template.asset ? await fs.readFile(template.asset) : null;

    await message.edit({
        embeds: [
            {
                title: `Das Geschenk enthielt: ${template.titleText} ${initialAttribute?.shortDisplay ?? ""}`.trim(),
                description: template.dropDescription,
                image: attachment
                    ? {
                          url: "attachment://opened.gif",
                      }
                    : undefined,
                fields: [
                    {
                        name: "🎉 Geschenköffner",
                        value: winner.toString(),
                    },
                    ...(initialAttribute
                        ? [
                              {
                                  name: "⭐ Rarität",
                                  value: initialAttribute?.displayName,
                              },
                          ]
                        : []),
                ],
                footer: {
                    text: `${messages.join("\n")}`.trim(),
                },
            },
        ],
        files: attachment
            ? [
                  {
                      name: "opened.gif",
                      attachment,
                  },
              ]
            : [],
        components: [],
    });

    if (template.onDrop) {
        await template.onDrop(context, winner, channel as TextChannel, claimedLoot).catch(err => {
            log.error(
                err,
                `Error while executing special action for loot ${claimedLoot.id} (template: ${template.id})`,
            );
            sentry.captureException(err);
        });
    }
}

type AdjustmentResult = {
    messages: string[];
    weights: number[];
};

async function getDropWeightAdjustments(
    user: User,
    weights: readonly number[],
): Promise<AdjustmentResult> {
    const waste = await lootService.getUserLootCountById(user.id, LootKindId.RADIOACTIVE_WASTE);
    const messages = [];

    let wasteFactor = 1;
    if (waste > 0) {
        const wasteDropPenalty = 1.05;
        wasteFactor = Math.min(2, waste ** wasteDropPenalty);
        messages.push(
            `Du hast ${waste} Tonnen radioaktiven Müll, deshalb ist die Chance auf ein Geschenk geringer.`,
        );
    }

    const pkv = await lootService.getUserLootCountById(user.id, LootKindId.PKV);
    let pkvFactor = 1;
    if (pkv > 0) {
        pkvFactor = 2;
        messages.push("Da du privat versichert bist, hast du die doppelte Chance auf eine AU.");
    }

    const newWeights = [...weights];
    newWeights[LootKindId.NICHTS] = Math.ceil(weights[LootKindId.NICHTS] * wasteFactor) | 0;
    newWeights[LootKindId.KRANKSCHREIBUNG] = (weights[LootKindId.KRANKSCHREIBUNG] * pkvFactor) | 0;

    return {
        messages,
        weights: newWeights,
    };
}

async function awardPostDropLootAttributes(loot: Loot) {
    switch (loot.lootKindId) {
        case LootKindId.KADSE:
            await lootService.addLootAttributeIfNotPresent(loot.id, LootAttributeKindId.SWEET);
            break;
        default:
            break;
    }
}
