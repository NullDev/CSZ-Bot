import * as fs from "node:fs/promises";

import {
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ComponentType,
    type TextChannel,
    type User,
    type Interaction,
    type GuildBasedChannel,
    type TextBasedChannel,
    MessageFlags,
    ContainerBuilder,
    ActionRowBuilder,
    type MessageEditOptions,
    type MessageComponentInteraction,
    type BaseMessageOptions,
} from "discord.js";
import { Temporal } from "@js-temporal/polyfill";
import * as sentry from "@sentry/node";

import type { BotContext } from "#context.ts";
import type { Loot, LootId } from "#storage/db/model.ts";
import type { LootTemplate } from "#storage/loot.ts";
import { randomBoolean, randomEntry, randomEntryWeighted } from "#service/random.ts";

import * as lootService from "#service/loot.ts";
import {
    LootAttributeClass,
    lootAttributeTemplates,
    LootKind,
    lootTemplates,
} from "#service/lootData.ts";

import log from "#log";

const lootTimeoutMs = 60 * 1000;

export async function runDropAttempt(context: BotContext) {
    const lootConfig = context.commandConfig.loot;
    const shouldDropLoot = randomBoolean(lootConfig.dropChance);
    if (!shouldDropLoot) {
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

    const lm = targetChannel.lastMessage?.createdAt;
    if (lm === undefined) {
        log.info(
            `Would have dropped loot to ${targetChannel.name}, but it does not have any messages yet`,
        );
        return;
    }

    const now = Temporal.Now.instant();
    const lastMessage = lm.toTemporalInstant();
    const passedTime = now.since(lastMessage);

    if (passedTime.subtract(lootConfig.maxTimePassedSinceLastMessage).sign > 0) {
        log.info(
            `Would have dropped loot to ${targetChannel.name}, but it was too soon since the last message (${lootConfig.maxTimePassedSinceLastMessage})`,
        );
        return;
    }

    log.info(
        `Randomization hit threshold (${lootConfig.dropChance}). Dropping loot to ${targetChannel.name}!`,
    );
    await postLootDrop(context, targetChannel, undefined, undefined);
}

export async function postLootDrop(
    context: BotContext,
    channel: GuildBasedChannel & TextBasedChannel,
    donor: User | undefined,
    predecessorLootId: LootId | undefined,
): Promise<Loot | undefined> {
    const takeLootButton = new ButtonBuilder()
        .setCustomId("take-loot")
        .setLabel("Geschenk nehmen")
        .setStyle(ButtonStyle.Primary);

    const timeoutSeconds = (lootTimeoutMs / 1000) | 0;
    const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        embeds: [],
        components: [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    header => header.setContent("# Geschenk"),
                    body =>
                        body.setContent(
                            donor
                                ? `${donor} hat ein Geschenk fallen lassen! Öffne es schnell, in ${timeoutSeconds} Sekunden ist es weg!`
                                : `Ein Geschenk ist aufgetaucht! Öffne es schnell, in ${timeoutSeconds} Sekunden ist es weg!`,
                        ),
                )
                .addMediaGalleryComponents(media =>
                    media.addItems(image => image.setURL("attachment://00-unopened.gif")),
                ),
            new ActionRowBuilder<ButtonBuilder>().addComponents(takeLootButton),
        ],
        files: [
            {
                name: "00-unopened.gif",
                attachment: await fs.readFile("assets/loot/00-unopened.gif"),
            },
        ],
    });

    let interaction: Interaction | undefined;

    try {
        interaction = await message.awaitMessageComponent({
            filter: i => i.customId === "take-loot",
            componentType: ComponentType.Button,
            time: lootTimeoutMs,
        });
    } catch {
        log.info(`Loot drop ${message.id} timed out; loot was not claimed, cleaning up`);
        await message.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().addTextDisplayComponents(
                    header => header.setContent("-# Geschenk"),
                    body =>
                        body.setContent(
                            donor
                                ? // TODO: `Keiner wollte das Geschenk von ${donor} haben. ${donor} hat es wieder mitgenommen.`
                                  `Das Geschenk von ${donor} verpuffte im nichts :(`
                                : `Oki aber nächstes mal bitti aufmachi, sonst muss ichs wieder mitnehmi ${context.emoji.sadHamster}`,
                        ),
                    footer => footer.setContent("-# ❌ Niemand war schnell genug"),
                ),
            ],
            embeds: [],
            files: [],
        });
        return;
    }

    const defaultWeights = lootTemplates.map(t => t.weight);
    const { messages, weights } = await getDropWeightAdjustments(interaction.user, defaultWeights);

    const template = randomEntryWeighted(lootTemplates, weights);

    const rarities = lootAttributeTemplates.filter(a => a.classId === LootAttributeClass.RARITY);
    const rarityWeights = rarities.map(a => a.initialDropWeight ?? 0);

    const rarityAttribute =
        template.id === LootKind.NICHTS ? null : randomEntryWeighted(rarities, rarityWeights);

    const claimedLoot = await lootService.createLoot(
        template,
        interaction.user,
        message,
        "drop",
        predecessorLootId ?? null,
        rarityAttribute,
    );

    const reply = await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!claimedLoot) {
        await reply.edit({
            content: `Upsi, da ist was schief gelaufi oder jemand anderes war schnelli ${context.emoji.sadHamster}`,
        });
        return;
    }

    await reply.delete();

    log.info(
        `User ${interaction.user.username} claimed loot ${claimedLoot.id} (template: ${template.id})`,
    );

    const winner = await context.guild.members.fetch(claimedLoot.winnerId);

    const canBeDoubled = !template.excludeFromDoubleDrops;
    const doubleOrNothingButton = new ButtonBuilder()
        .setCustomId("double-or-nothing")
        .setLabel("Doppelt oder Nix")
        .setStyle(ButtonStyle.Primary);

    const content = await createDropTakenContent(
        context,
        template,
        claimedLoot,
        winner.user,
        messages,
    );

    if (canBeDoubled) {
        content.components[0].addActionRowComponents(a => a.addComponents(doubleOrNothingButton));
    }

    const dropMessage: MessageEditOptions = {
        flags: MessageFlags.IsComponentsV2,
        components: content.components,
        embeds: [],
        files: content.files,
    };

    await message.edit(dropMessage);

    if (template.onDrop) {
        await template.onDrop(context, winner, channel as TextChannel, claimedLoot).catch(err => {
            log.error(
                err,
                `Error while executing special action for loot ${claimedLoot.id} (template: ${template.id})`,
            );
            sentry.captureException(err);
        });
    }

    if (!canBeDoubled) {
        return;
    }

    let doubleOrNothingInteraction: MessageComponentInteraction | undefined;

    try {
        doubleOrNothingInteraction = await message.awaitMessageComponent({
            filter: i => i.customId === "double-or-nothing" && i.user.id === winner.id,
            componentType: ComponentType.Button,
            time: 5000,
        });
    } catch {
        return;
    } finally {
        // Remove the last action row with the button. Only works because there is only one action row.
        content.components[0].spliceComponents(content.components[0].components.length - 1, 1);
        await message.edit(dropMessage);
        if (doubleOrNothingInteraction) {
            await doubleOrNothingInteraction.deferUpdate();
        }
    }

    if (randomBoolean()) {
        await channel.send(
            `DOPPELT ODER NIX, ${winner}! Du bekommst dein Geschenk nicht nochmal und gehst stattdessen leer aus. Loser!`,
        );

        await Promise.all([
            lootService.deleteLoot(claimedLoot.id),
            lootService.deleteLootByPredecessor(claimedLoot.id),
            message.delete(),
        ]);
        return;
    }

    if (template.onDuplicateDrop) {
        const proceedWithSecondDrop = await template.onDuplicateDrop(
            context,
            winner,
            claimedLoot,
            message,
        );
        if (!proceedWithSecondDrop) {
            return;
        }
    }

    const extraLoot = await lootService.createLoot(
        template,
        winner.user,
        message,
        "double-or-nothing",
        claimedLoot.id,
        rarityAttribute,
    );
    if (!extraLoot) {
        await channel.send(`${winner}, ups, da ist was schief gelaufi ${context.emoji.sadHamster}`);
        return;
    }

    await channel.send(
        `DOPPELT ODER NIX, ${winner}! Du bekommst dein Geschenk nochmal! 99% der Spieler hören vor dem großen Gewinn auf. Du gehörst nicht dazu und bist ein Gewinnertyp! 🎉`,
    );
}

export type GeneratedContent = {
    components: [ContainerBuilder];
    files: BaseMessageOptions["files"];
};

export async function createDropTakenContent(
    context: BotContext,
    template: Readonly<LootTemplate>,
    claimedLoot: Readonly<Loot>,
    winner: User,
    dropMessages: readonly string[],
): Promise<GeneratedContent> {
    const attachment = template.drawCustomAsset
        ? await template.drawCustomAsset(context, winner, template, claimedLoot)
        : template.asset
          ? await fs.readFile(template.asset)
          : null;

    const container = new ContainerBuilder().addTextDisplayComponents(
        t => t.setContent(`-# 🎉 ${winner} hat das Geschenk geöffnet und bekommt:`),
        t => t.setContent(`# ${template.displayName}`),
        t => t.setContent(template.dropDescription),
    );

    const lootAttributes = await lootService.getLootAttributes(claimedLoot.id);

    const rarityAttribute = lootAttributes.filter(
        a => a.attributeClassId === LootAttributeClass.RARITY,
    )[0];

    if (rarityAttribute) {
        container.addTextDisplayComponents(
            t => t.setContent("**✨ Rarität**"),
            t =>
                t.setContent(
                    `${rarityAttribute.shortDisplay} ${rarityAttribute.displayName}`.trim(),
                ),
        );
    }

    if (attachment) {
        container.addMediaGalleryComponents(media =>
            media.addItems(image => image.setURL("attachment://opened.gif")),
        );
    }

    const allMessages = dropMessages.join("\n").trim();
    if (allMessages.length > 0) {
        container.addTextDisplayComponents(t => t.setContent(`-# ${allMessages}`));
    }

    return {
        components: [container],
        files: attachment
            ? [
                  {
                      name: "opened.gif",
                      attachment,
                  },
              ]
            : [],
    };
}

type AdjustmentResult = {
    messages: string[];
    weights: number[];
};

function getTimeOfDayMultipliers(weights: readonly number[]): number[] {
    const now = new Date();
    const hour = Number(
        now.toLocaleString("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }),
    );

    const multipliers = new Array(weights.length).fill(1);

    // Morgens (6:00 - 12:00): Höhere Wahrscheinlichkeit für Frühstücks-Items
    const isMorning = hour >= 6 && hour < 12;
    // Abends (18:00 - 24:00): Höhere Wahrscheinlichkeit für Feierabend-Items
    const isEvening = hour >= 18 && hour < 24;

    if (isMorning) {
        multipliers[LootKind.KAFFEEMUEHLE] = 2;
        multipliers[LootKind.KRANKSCHREIBUNG] = 2;
        multipliers[LootKind.OETTINGER] = 2;
    }

    if (isEvening) {
        multipliers[LootKind.DOENER] = 2;
        multipliers[LootKind.AYRAN] = 2;
        multipliers[LootKind.SAHNE] = 2;
        multipliers[LootKind.TRICHTER] = 2;
        multipliers[LootKind.GAULOISES_BLAU] = 2;
    }

    return multipliers;
}

async function getDropWeightAdjustments(
    user: User,
    weights: readonly number[],
): Promise<AdjustmentResult> {
    const waste = await lootService.getUserLootCountById(user.id, LootKind.RADIOACTIVE_WASTE);
    const messages = [];

    let wasteFactor = 1;
    if (waste > 0) {
        const wasteDropPenalty = 1.05;
        wasteFactor = Math.min(2, waste ** wasteDropPenalty);
        messages.push(
            `Du hast ${waste} Tonnen radioaktiven Müll, deshalb ist die Chance auf ein Geschenk geringer.`,
        );
    }

    const pkv = await lootService.getUserLootCountById(user.id, LootKind.PKV);
    let pkvFactor = 1;
    if (pkv > 0) {
        pkvFactor = 2;
        messages.push("Da du privat versichert bist, hast du die doppelte Chance auf eine AU.");
    }

    const timeMultipliers = getTimeOfDayMultipliers(weights);

    const newWeights = [...weights];
    newWeights[LootKind.NICHTS] = Math.ceil(weights[LootKind.NICHTS] * wasteFactor) | 0;
    newWeights[LootKind.KRANKSCHREIBUNG] =
        (weights[LootKind.KRANKSCHREIBUNG] * pkvFactor * timeMultipliers[LootKind.KRANKSCHREIBUNG]) |
        0;

    // Tageszeitabhängige Anpassungen
    newWeights[LootKind.KAFFEEMUEHLE] =
        (weights[LootKind.KAFFEEMUEHLE] * timeMultipliers[LootKind.KAFFEEMUEHLE]) | 0;
    newWeights[LootKind.OETTINGER] =
        (weights[LootKind.OETTINGER] * timeMultipliers[LootKind.OETTINGER]) | 0;
    newWeights[LootKind.DOENER] = (weights[LootKind.DOENER] * timeMultipliers[LootKind.DOENER]) | 0;
    newWeights[LootKind.AYRAN] = (weights[LootKind.AYRAN] * timeMultipliers[LootKind.AYRAN]) | 0;
    newWeights[LootKind.SAHNE] = (weights[LootKind.SAHNE] * timeMultipliers[LootKind.SAHNE]) | 0;
    newWeights[LootKind.TRICHTER] =
        (weights[LootKind.TRICHTER] * timeMultipliers[LootKind.TRICHTER]) | 0;
    newWeights[LootKind.GAULOISES_BLAU] =
        (weights[LootKind.GAULOISES_BLAU] * timeMultipliers[LootKind.GAULOISES_BLAU]) | 0;

    return {
        messages,
        weights: newWeights,
    };
}
