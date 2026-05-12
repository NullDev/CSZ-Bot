import {
    ChannelType,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandNumberOption,
} from "discord.js";

import type { BotContext } from "#/context.ts";
import type { ApplicationCommand } from "#/commands/command.ts";
import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";

import * as lootDataService from "#/service/lootData.ts";
import * as lootService from "#/service/loot.ts";

import { postLootDrop, type LootClaimCallback } from "#/service/lootDrop.ts";

export default class LootDropCommand implements ApplicationCommand {
    name = "loot-drop";
    description = "Drops dir 1 Loot";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addNumberOption(
            new SlashCommandNumberOption()
                .setName("loot-kind-id")
                .setDescription("Loot ID die gedroppt werden soll")
                .setMinValue(0),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const command = ensureChatInputCommand(interaction);

        if (command.guild === null) {
            throw new Error("Interaction not in guild");
        }
        if (command.channel?.type !== ChannelType.GuildText) {
            throw new Error("Interaction not in text channel");
        }

        const lootKindId = command.options.getNumber("loot-kind-id", false);
        if (lootKindId === null) {
            await command.reply({
                content: "Es muss eine Loot ID angegeben werden.",
                ephemeral: true,
            });
            return;
        }
        const lootTemplate = lootDataService.resolveLootTemplate(lootKindId);
        if (lootTemplate === undefined) {
            await command.reply({
                content: `Es konnte kein Loot mit der ID ${lootKindId} gefunden werden.`,
                ephemeral: true,
            });
            return;
        }
        const predefinedLootClaim: LootClaimCallback = async (winner, message) => {
            const loot = await lootService.createLoot(
                lootTemplate,
                winner,
                message,
                "drop",
                null,
                null,
            );
            if (!loot) return undefined;
            return { loot, template: lootTemplate, rarity: undefined, messages: [] };
        };
        await postLootDrop(context, command.channel, command.user, predefinedLootClaim);
        await command.reply({
            content: `Es wurde ${lootTemplate.id} gedroppt!`,
            ephemeral: true,
        });
    }
}
