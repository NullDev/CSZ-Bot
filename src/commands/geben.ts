import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import * as lootService from "@/service/loot.js";
import * as lootRoleService from "@/service/lootRoles.js";
import { randomEntry } from "@/utils/arrayUtils.js";

export default class GebenCommand implements ApplicationCommand {
    name = "geben";
    description = "Gebe dem Wärter etwas Atommüll und etwas süßes";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const currentGuard = await lootRoleService.getCurrentAsseGuardOnDuty(context);
        if (!currentGuard) {
            await interaction.reply({
                embeds: [
                    {
                        description:
                            "Es ist kein Wärter im Dienst. Das Tor ist zu. Du rennst dagegen. Opfer.",
                        color: 0xff0000,
                    },
                ],
            });
            return;
        }

        const wasteContents = await lootService.getUserLootsById(
            interaction.user,
            lootService.LootTypeId.RADIOACTIVE_WASTE,
        );

        if (wasteContents.length === 0) {
            await interaction.reply({
                content: "Du hast keinen Atommüll, den du in die Grube werfen kannst.",
            });
            return;
        }

        const sweetContent = await lootService.getUserLootsById(
            interaction.user,
            lootService.LootTypeId.KADSE,
        );

        if (sweetContent.length === 0) {
            await interaction.reply({
                content: "Du hast keine süßen Sachen, mit dem du den Wärter bestechen kannst.",
            });
            return;
        }

        await lootService.transferLootToUser(sweetContent[0].id, currentGuard.user);
        await lootService.transferLootToUser(wasteContents[0].id, currentGuard.user);

        const messages = [
            `Du hast dem Wärter ${currentGuard} etwas Atommüll und etwas süßes gegeben.`,
            `${currentGuard} hat sich über deinen Atommüll und die süßen Sachen gefreut.`,
            `${currentGuard} hat sich gerade die hübschen Vögel angeschaut. Du konntest ihm unbemerkt ein Fass Atommüll an im vorbei rollen und hast ihm als Geschenk etwas süßes hinterlassen.`,
        ];

        await interaction.reply({
            embeds: [
                {
                    title: "Atommüll entsorgt!",
                    description: randomEntry(messages),
                    color: 0x00ff00,
                },
            ],
        });
    }
}
