import {
    type CommandInteraction,
    type GuildBasedChannel,
    SlashCommandBuilder,
    SlashCommandNumberOption,
} from "discord.js";

import type { BotContext } from "#/context.ts";
import type { ApplicationCommand } from "#/commands/command.ts";
import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";

import * as lootDataService from "#/service/lootData.ts";

import { postLootDrop } from "#/service/lootDrop.ts";

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

        const channel = command.channel as GuildBasedChannel;
        if (channel === null) {
            throw new Error("Interaction not in channel");
        }
        if (channel.isTextBased() === false) {
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
        await postLootDrop(context, channel, command.user, undefined, {
            rarity: undefined,
            template: lootTemplate,
        });
        await command.reply({
            content: `Es wurde ${lootTemplate.id} gedroppt!`,
            ephemeral: true,
        });
    }
}
