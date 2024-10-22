import {
    type APIEmbed,
    APIEmbedField,
    type BooleanCache,
    type CacheType,
    type InteractionResponse,
} from "discord.js";
import type { JSONEncodable } from "@discordjs/util";
import { setTimeout } from "node:timers/promises";
import { BaseEntity, Entity } from "@/service/fightData.js";

export interface FightScene {
    player: Entity;
    enemy: Entity;
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
            value.afterFight({ player: enemy, enemy: player });
        });
        await interactionResponse.edit({ embeds: [renderFightEmbedded(scene)] });
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
        inline: true,
    };
}

function renderFightEmbedded(fightscene: FightScene): JSONEncodable<APIEmbed> | APIEmbed {
    return {
        title: `Kampf zwischen ${fightscene.player.stats.name} und ${fightscene.enemy.stats.name}`,
        description: "Lol hier beschreibung",
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
