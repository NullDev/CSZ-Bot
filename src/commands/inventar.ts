import { type CommandInteraction, SlashCommandBuilder, SlashCommandUserOption } from "discord.js";

import type { BotContext } from "../context.js";
import type { ApplicationCommand } from "./command.js";
import * as lootService from "../service/lootService.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";

export default class InventarCommand implements ApplicationCommand {
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

    async handleInteraction(interaction: CommandInteraction, _context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);

        const user = cmd.options.getUser("user") ?? cmd.user;

        const contents = await lootService.getInventoryContents(user);

        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }

        const groupedByLoot = Object.groupBy(contents, item => item.displayName);

        const items = Object.entries(groupedByLoot)
            .map(([_, items]) => items)
            .filter(i => !!i && i.length > 0)
            // biome-ignore lint/style/noNonNullAssertion: see filter above
            .map(i => [i![0]!, i!.length] as const);

        const description = items
            .map(([item, count]) => {
                const emote = lootService.getEmote(item);
                const e = emote ? `${emote} ` : "";
                return count === 1
                    ? `${e}${item.displayName}`
                    : `${count}x ${e}${item.displayName}`;
            })
            .join("\n");

        const cuties = contents.filter(i => i.lootKindId === lootService.LootTypeId.KADSE).length;

        await interaction.reply({
            embeds: [
                {
                    title: `Inventar von ${user.displayName}`,
                    description,
                    footer: {
                        text:
                            cuties > 0
                                ? `Es befinden sich insgesamt ${cuties} süße und ${contents.length === cuties ? "keine normalen" : `${contents.length - cuties} normale`} Gegenstände im Inventar`
                                : `Es befinden sich insgesamt ${contents.length} Gegenstände im Inventar`,
                    },
                },
            ],
        });
    }
}
