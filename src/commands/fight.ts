import type { ApplicationCommand } from "@/commands/command.js";
import {
    APIEmbed,
    APIEmbedField,
    type CommandInteraction,
    ContextMenuCommandBuilder,
    SlashCommandBuilder,
    SlashCommandUserOption,
} from "discord.js";
import type { BotContext } from "@/context.js";
import { fight, FightScene } from "@/service/fight.js";
import { JSONEncodable } from "@discordjs/util";
import { bossMap, Entity } from "@/service/fightData.js";

export default class FightCommand implements ApplicationCommand {
    readonly description = "TBD";
    readonly name = "fight";
    readonly applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(builder =>
            builder
                .setRequired(true)
                .setName("boss")
                .setDescription("Boss")
                //switch to autocomplete when we reach 25
                .addChoices(
                    Object.entries(bossMap).map(boss => {
                        return {
                            name: boss[1].name,
                            value: boss[0],
                        };
                    }),
                ),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        const boss = command.options.get("boss", true).value as string;
        const interactionResponse = await command.deferReply();
        const playerstats = {
            name: "Player",
            description: "",
            health: 80,
            baseDamage: 1,
            baseDefence: 0,
            items: [],
        };
        console.log(boss);
        await fight(playerstats, bossMap[boss], interactionResponse);
    }
}
