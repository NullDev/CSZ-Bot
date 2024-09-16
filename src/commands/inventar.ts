import {
    ActionRowBuilder,
    type APIEmbed,
    ButtonBuilder,
    ButtonStyle,
    type CacheType,
    type CommandInteraction,
    type InteractionReplyOptions,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandUserOption,
    type User,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import * as lootService from "@/service/loot.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";
import { format } from "@/utils/stringUtils.js";

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
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
                .setName("long")
                .setRequired(false)
                .setDescription("kurz oder lang"),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);

        const user = cmd.options.getUser("user") ?? cmd.user;
        const short = cmd.options.getBoolean("long") ?? false;

        const contents = await lootService.getInventoryContents(user);
        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }
        if (short) {
            await this.#createLongEmbed(context, interaction, user);
        } else {
            await this.#createShortEmbed(context, interaction, user);
        }
    }

    async #createShortEmbed(
        context: BotContext,
        interaction: CommandInteraction<CacheType>,
        user: User,
    ) {
        const contents = await lootService.getInventoryContents(user);
        const groupedByLoot = Object.groupBy(contents, item => item.displayName);

        const items = Object.entries(groupedByLoot)
            .map(([_, items]) => items)
            .filter(i => !!i && i.length > 0)
            // biome-ignore lint/style/noNonNullAssertion: see filter above
            .map(i => [i![0]!, i!.length] as const);

        const description = items
            .map(([item, count]) => {
                const emote = lootService.getEmote(context.guild, item);
                const e = emote ? `${emote} ` : "";
                return count === 1
                    ? `${e}${item.displayName}`
                    : `${count}x ${e}${item.displayName}`;
            })
            .join("\n");

        const cuties = contents.filter(i => i.lootKindId === lootService.LootTypeId.KADSE).length;

        const message = /* mf2 */ `
.match {$cuties :number} {$count :number}
0 0 {{Es befindet sich einfach überhaupt nichts in diesem Inventar}}
0 1 {{Es befindet sich 1 Gegenstand im Inventar}}
0 * {{Es befinden sich {$count} Gegenstände im Inventar}}
1 0 {{Es befinden sich insgesamt 1 süßer und keine normalen Gegenstände im Inventar}}
1 1 {{Es befinden sich insgesamt 1 süßer und 1 normaler Gegenstand im Inventar}}
1 few {{Es befinden sich insgesamt 1 süßer und ein paar Gegenstände im Inventar}}
1 * {{Es befinden sich insgesamt 1 süßer und {$count} normale Gegenstände im Inventar}}
* * {{Es befinden sich insgesamt {$cuties} süße und {$count} normale Gegenstände im Inventar}}
`.trim();

        await interaction.reply({
            embeds: [
                {
                    title: `Inventar von ${user.displayName}`,
                    description,
                    footer: {
                        text: format(message, { cuties, count: contents.length - cuties }),
                    },
                },
            ],
        });
    }

    async #createLongEmbed(context: BotContext, interaction: CommandInteraction, user: User) {
        await interaction.reply(await getInvAsEmb(context, user, 0));
    }
}

export async function getInvAsEmb(
    context: BotContext,
    user: User,
    pageIndex: number,
): Promise<InteractionReplyOptions> {
    const pageSize = 25;

    const contentsUnsorted = await lootService.getInventoryContents(user);
    const contents = contentsUnsorted.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

    const lastPageIndex = Math.floor(contents.length / pageSize);

    const pageContents = contents.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

    const prev = new ButtonBuilder()
        .setCustomId(`lootTable/${user.id}/${Math.max(pageIndex - pageSize, 0)}`)
        .setLabel("<<")
        .setDisabled(pageIndex <= 0)
        .setStyle(ButtonStyle.Secondary);

    const next = new ButtonBuilder()
        .setCustomId(`lootTable/${user.id}/${pageIndex + pageSize}`)
        .setLabel(">>")
        .setDisabled(pageIndex >= lastPageIndex)
        .setStyle(ButtonStyle.Secondary);

    const embedsItems = pageContents.map(item => ({
        name: `${lootService.getEmote(context.guild, item)} ${item.displayName}`,
        value: "",
        inline: false,
    }));

    return {
        components: [new ActionRowBuilder<ButtonBuilder>().setComponents(prev, next)],
        embeds: [
            {
                title: `Inventar von ${user.displayName}`,
                fields: embedsItems,
                footer: {
                    text: `Seite ${pageIndex + 1} von ${lastPageIndex + 1}`,
                },
            } satisfies APIEmbed,
        ],
        fetchReply: true,
        tts: false,
    };
}
