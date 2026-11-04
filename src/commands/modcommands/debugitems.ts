import {
    type CommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandIntegerOption,
    SlashCommandUserOption,
} from "discord.js";

import type { BotContext } from "#/context.ts";
import type { ApplicationCommand } from "#/commands/command.ts";
import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";
import * as lootService from "#/service/loot.ts";
import {
    LootKind,
    LootAttributeKind,
    lootAttributeTemplates,
    resolveLootTemplate,
} from "#/service/lootData.ts";

const GIVEABLE_ITEMS = Object.values(LootKind).filter(id => id !== LootKind.NICHTS);
const RARITY_NORMAL = lootAttributeTemplates.find(a => a.id === LootAttributeKind.RARITY_NORMAL)!;

export default class DebugItemsCommand implements ApplicationCommand {
    modCommand = true;
    name = "debugitems";
    description = "[DEBUG] Gibt einem Nutzer verschiedene Items";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(
            new SlashCommandUserOption()
                .setName("target")
                .setDescription("Der Nutzer, der die Items erhalten soll")
                .setRequired(false),
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
                .setName("item_id")
                .setDescription("Spezifische Item-ID (optional, sonst alle)")
                .setRequired(false)
                .setMinValue(1),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext): Promise<void> {
        const command = ensureChatInputCommand(interaction);

        if (!interaction.guild) {
            throw new Error("Interaction not in guild");
        }

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member || !context.roleGuard.isMod(member)) {
            await interaction.reply({
                content: "Nur Mods können diesen Befehl benutzen.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const targetUser = command.options.getUser("target") ?? interaction.user;
        const specificItemId = command.options.getInteger("item_id");

        const itemIds = specificItemId !== null ? [specificItemId] : GIVEABLE_ITEMS;

        const given: string[] = [];
        const failed: number[] = [];

        for (const itemId of itemIds) {
            const template = resolveLootTemplate(itemId as (typeof GIVEABLE_ITEMS)[number]);
            if (!template) {
                failed.push(itemId);
                continue;
            }

            try {
                await lootService.createLoot(
                    template,
                    targetUser,
                    null,
                    "birthday",
                    null,
                    RARITY_NORMAL,
                );
                given.push(`${template.emote ?? "📦"} ${template.displayName} (${itemId})`);
            } catch {
                failed.push(itemId);
            }
        }

        const lines: string[] = [
            `**${given.length}** Item(s) an <@${targetUser.id}> gegeben:`,
            ...given.map(n => `- ${n}`),
        ];

        if (failed.length > 0) {
            lines.push(`\nFehlgeschlagen (IDs): ${failed.join(", ")}`);
        }

        await interaction.reply({
            content: lines.join("\n"),
            flags: MessageFlags.Ephemeral,
        });
    }
}
