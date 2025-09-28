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
    TextDisplayBuilder,
    ActionRowBuilder,
    type MessageEditOptions,
    type MessageComponentInteraction,
} from "discord.js";
import { Temporal } from "@js-temporal/polyfill";
import * as sentry from "@sentry/node";

import type { BotContext } from "@/context.js";
import type { Loot, LootId } from "@/storage/db/model.js";
import { randomBoolean, randomEntry, randomEntryWeighted } from "@/service/random.js";

import * as lootService from "@/service/loot.js";
import {
    LootAttributeClassId,
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
                                : `Oki aber nächstes mal bitti aufmachi, sonst muss ichs wieder mitnehmi ${hamster}`,
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

    const rarities = lootAttributeTemplates.filter(a => a.classId === LootAttributeClassId.RARITY);
    const rarityWeights = rarities.map(a => a.initialDropWeight ?? 0);

    const rarityAttribute =
        template.id === LootKindId.NICHTS ? null : randomEntryWeighted(rarities, rarityWeights);

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
            content: `Upsi, da ist was schief gelaufi oder jemand anderes war schnelli ${hamster}`,
        });
        return;
    }

    await reply.delete();

    log.info(
        `User ${interaction.user.username} claimed loot ${claimedLoot.id} (template: ${template.id})`,
    );

    const winner = await context.guild.members.fetch(claimedLoot.winnerId);

    const attachment = template.drawCustomAsset
        ? await template.drawCustomAsset(context, winner.user, template, claimedLoot)
        : template.asset
          ? await fs.readFile(template.asset)
          : null;

    const canBeDoubled = !template.excludeFromDoubleDrops;
    const doubleOrNothingButton = new ButtonBuilder()
        .setCustomId("double-or-nothing")
        .setLabel("Doppelt oder Nix")
        .setStyle(ButtonStyle.Primary);

    const container = new ContainerBuilder().addTextDisplayComponents(
        t => t.setContent("-# Das Geschenk enthielt"),
        t => t.setContent(`# ${template.titleText}`),
        t => t.setContent(template.dropDescription),
        t => t.setContent("**🎉 Ehrenwerter Empfänger**"),
        t => t.setContent(winner.toString()),
    );

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

    const allMessages = messages.join("\n").trim();
    if (allMessages.length > 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# ${allMessages}`),
        );
    }

    if (canBeDoubled) {
        container.addActionRowComponents(a => a.addComponents(doubleOrNothingButton));
    }

    const dropMessage: MessageEditOptions = {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        embeds: [],
        files: attachment
            ? [
                  {
                      name: "opened.gif",
                      attachment,
                  },
              ]
            : [],
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
        container.spliceComponents(container.components.length - 1, 1);
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
            channel as TextChannel,
            claimedLoot,
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
        await channel.send(`${winner}, ups, da ist was schief gelaufi ${hamster}`);
        return;
    }

    await channel.send(
        `DOPPELT ODER NIX, ${winner}! Du bekommst dein Geschenk nochmal! 99% der Spieler hören vor dem großen Gewinn auf. Du gehörst nicht dazu und bist ein Gewinnertyp! 🎉`,
    );
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
