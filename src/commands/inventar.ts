import type { BotContext } from "../context.js";
import type { ApplicationCommand } from "./command.js";
import * as lootService from "../service/lootService.js";
import {
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandUserOption,
} from "discord.js";
import { ensureChatInputCommand } from "src/utils/interactionUtils.js";

export class InventarCommand implements ApplicationCommand {
    modCommand = false;
    name = "inventar";
    description = "Das Inventar mit deinen gesammelten Geschenken.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(
            new SlashCommandUserOption()
                .setRequired(false)
                .setName("user")
                .setDescription("Wem du tun willst"),
        );

    async handleInteraction(
        interaction: CommandInteraction,
        _context: BotContext,
    ): Promise<void> {
        const cmd = ensureChatInputCommand(interaction);

        const user = cmd.options.getUser("user") ?? cmd.user;

        const contents = await lootService.getInventoryContents(user);

        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }

        const groupedByLoot = Object.groupBy(contents, item => item.lootKindId);

        const contentsString = Object.entries(groupedByLoot)
            .map(([_, items]) => items)
            .filter(items => !!items && items.length > 0)
            .map(items => {
                // biome-ignore lint/style/noNonNullAssertion: see filter above
                const firstItem = items![0];
                const emote = lootService.getEmote(firstItem);
                const e = emote ? `${emote} ` : "";

                // biome-ignore lint/style/noNonNullAssertion: see filter above
                return items!.length === 1
                    ? `- ${e}${firstItem.displayName}`
                    : // biome-ignore lint/style/noNonNullAssertion: <explanation>
                      `- ${items!.length}x ${e}${firstItem.displayName}`;
            })
            .join("\n");

        await interaction.reply({
            embeds: [
                {
                    title: `Inventar von ${user.displayName}`,
                    description: contentsString,
                    footer: {
                        text: `Es befinden sich insgesamt ${contents.length} Gegenstände im Inventar`,
                    },
                },
            ],
        });
    }
}
