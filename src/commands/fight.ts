import type { ApplicationCommand } from "@/commands/command.js";
import {
    APIEmbed,
    APIEmbedField, type BooleanCache, type CacheType,
    type CommandInteraction,
    ContextMenuCommandBuilder, type InteractionResponse,
    SlashCommandBuilder,
    SlashCommandUserOption
} from "discord.js";
import type { BotContext } from "@/context.js";
import { JSONEncodable } from "@discordjs/util";
import {BaseEntity, bossMap, Entity} from "@/service/fightData.js";
import {setTimeout} from "node:timers/promises";

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


type result = "PLAYER" | "ENEMY" | undefined;

function checkWin(fightscene: FightScene): result {
    if (fightscene.player.stats.health < 0) {
        return "ENEMY";
    }
    if (fightscene.enemy.stats.health < 0) {
        return "PLAYER";
    }
}

export async function fight(
    playerstats: BaseEntity,
    enemystats: BaseEntity,
    interactionResponse: InteractionResponse<BooleanCache<CacheType>>
) {
    const enemy = new Entity(enemystats);
    const player = new Entity(playerstats);

    const scene: FightScene = {
        player: player,
        enemy: enemy
    };
    while (checkWin(scene) === undefined) {
        player.itemtext = [];
        enemy.itemtext = [];
        //playerhit first
        player.attack(enemy);
        // then enemny hit
        enemy.attack(player);
        //special effects from items

        player.stats.items.forEach(value => {
            if (!value.afterFight) {
                return;
            }
            value.afterFight(scene);
        });
        enemy.stats.items.forEach(value => {
            if (!value.afterFight) {
                return;
            }
            value.afterFight({player: enemy, enemy: player});
        });
        await interactionResponse.edit({embeds: [renderFightEmbedded(scene)]});
        await setTimeout(200);
    }
}

function renderStats(player: Entity) {
    while (player.itemtext.length < 5) {
        player.itemtext.push("-");
    }

    return {
        name: player.stats.name,
        value: `❤️HP${player.stats.health}/${player.maxhealth}
            ❤️${"=".repeat(Math.max(0, (player.stats.health / player.maxhealth) * 10))}
            ⚔️Waffe: ${player.stats.weapon?.name ?? "Schwengel"} ${player.lastattack}
            🛡️Rüstung: ${player.stats.armor?.name ?? "Nackt"} ${player.lastdefence}
            📚Items:
            ${player.itemtext.join("\n")}
        `,
        inline: true
    };
}

function renderFightEmbedded(fightscene: FightScene): JSONEncodable<APIEmbed> | APIEmbed {
    return {
        title: `Kampf zwischen ${fightscene.player.stats.name} und ${fightscene.enemy.stats.name}`,
        description: fightscene.enemy.stats.description,
        fields: [
            renderStats(fightscene.player),
            renderStats(fightscene.enemy),
            {
                name: "Verlauf",
                value: " "
            }
        ]
    };
}
