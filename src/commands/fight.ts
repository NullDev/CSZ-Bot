import type { ApplicationCommand } from "@/commands/command.js";
import {
    type APIEmbed,
    APIEmbedField,
    type BooleanCache,
    type CacheType,
    type CommandInteraction,
    type InteractionResponse,
    SlashCommandBuilder,
    type User,
} from "discord.js";
import type { BotContext } from "@/context.js";
import type { JSONEncodable } from "@discordjs/util";
import {
    type BaseEntity,
    baseStats,
    bossMap,
    Entity,
    type EquipableArmor,
    type EquipableItem,
    type EquipableWeapon,
    type FightScene,
} from "@/service/fightData.js";
import { setTimeout } from "node:timers/promises";
import { getFightInventoryEnriched, removeItemsAfterFight } from "@/storage/fightinventory.js";
import { getLastFight, insertResult } from "@/storage/fighthistory.js";

async function getFighter(user: User): Promise<BaseEntity> {
    const userInventory = await getFightInventoryEnriched(user.id);

    return {
        ...baseStats,
        name: user.displayName,
        weapon: {
            name: userInventory.weapon?.itemInfo?.displayName ?? "Nichts",
            ...(userInventory.weapon?.gameTemplate as EquipableWeapon),
        },
        armor: {
            name: userInventory.armor?.itemInfo?.displayName ?? "Nichts",
            ...(userInventory.armor?.gameTemplate as EquipableArmor),
        },
        items: userInventory.items.map(value => {
            return {
                name: value.itemInfo?.displayName ?? "Error",
                ...(value.gameTemplate as EquipableItem),
            };
        }),
    };
}

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
                    Object.entries(bossMap)
                        .filter(boss => boss[1].enabled)
                        .map(boss => {
                            return {
                                name: boss[1].name,
                                value: boss[0],
                            };
                        }),
                ),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        const boss = command.options.get("boss", true).value as string;

        const lastFight = await getLastFight(command.user.id);

        //   if (lastFight !== undefined && (new Date(lastFight?.createdAt).getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 5)) {
        //       await command.reply({
        //               embeds:
        //                   [{
        //                       title: "Du bist noch nicht bereit",
        //                       color: 0xe74c3c,
        //                       description: `Dein Letzter Kampf gegen ${bossMap[lastFight.bossName]?.name} ist noch keine 5 Tage her. Gegen ${bossMap[boss].name} hast du sowieso Chance, aber noch weniger, wenn nicht die vorgeschriebenen Pausenzeiten einhältst `
        //                   }
        //                   ]
        //               ,
        //               ephemeral: true
        //           }
        //       );

        //       return;
        //   }

        const interactionResponse = await command.deferReply();

        const playerstats = await getFighter(command.user);

        await fight(command.user, playerstats, boss, { ...bossMap[boss] }, interactionResponse);
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

function renderEndScreen(fightscene: FightScene): APIEmbed | JSONEncodable<APIEmbed> {
    const result = checkWin(fightscene);
    const fields = [
        renderStats(fightscene.player),
        renderStats(fightscene.enemy),
        {
            name: "Verlauf",
            value: " ",
        },
        {
            name: " Die Items sind dir leider beim Kampf kaputt gegangen: ",
            value: fightscene.player.stats.items.map(value => value.name).join(" \n"),
        },
    ];
    if (result === "PLAYER") {
        return {
            title: `Mit viel Glück konnte ${fightscene.player.stats.name} ${fightscene.enemy.stats.name} besiegen `,
            color: 0x57f287,
            description: fightscene.enemy.stats.description,
            fields: fields,
        };
    }
    if (result === "ENEMY") {
        return {
            title: `${fightscene.enemy.stats.name} hat ${fightscene.player.stats.name} gnadenlos vernichtet`,
            color: 0xed4245,
            description: fightscene.enemy.stats.description,
            fields: fields,
        };
    }
    return {
        title: `Kampf zwischen ${fightscene.player.stats.name} und ${fightscene.enemy.stats.name}`,
        description: fightscene.enemy.stats.description,
        fields: fields,
    };
}

export async function fight(
    user: User,
    playerstats: BaseEntity,
    boss: string,
    enemystats: BaseEntity,
    interactionResponse: InteractionResponse<BooleanCache<CacheType>>,
) {
    const enemy = new Entity(enemystats);
    const player = new Entity(playerstats);

    const scene: FightScene = {
        player: player,
        enemy: enemy,
    };
    while (checkWin(scene) === undefined) {
        player.itemtext = [];
        enemy.itemtext = [];
        //playerhit first
        player.attack(enemy);
        // then enemny hit
        enemy.attack(player);
        //special effects from items
        for (const value of player.stats.items) {
            if (!value.afterFight) {
                continue;
            }
            value.afterFight(scene);
        }
        for (const value of enemy.stats.items) {
            if (!value.afterFight) {
                continue;
            }
            value.afterFight({ player: enemy, enemy: player });
        }
        await interactionResponse.edit({ embeds: [renderFightEmbedded(scene)] });
        await setTimeout(200);
    }

    await interactionResponse.edit({ embeds: [renderEndScreen(scene)] });
    //delete items
    await removeItemsAfterFight(user.id);
    //
    await insertResult(user.id, boss, checkWin(scene) === "PLAYER");
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
        inline: true,
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
                value: " ",
            },
        ],
    };
}
