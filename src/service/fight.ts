import { APIEmbed, APIEmbedField, BooleanCache, CacheType, InteractionResponse } from "discord.js";
import { JSONEncodable } from "@discordjs/util";
import { setTimeout } from "node:timers/promises";
import { name } from "croner";
import { en } from "chrono-node";

interface EquipableWeapon {
    attack: Range;
    name: string;
}

interface EquipableArmor {
    defence: Range;
    health: number;
    name: string;
}

export interface BaseEntity {
    health: number;
    name: string;
    baseDamage: number;
    baseDefence: number;
    items: EquipableItem[];
    weapon?: EquipableWeapon;
    armor?: EquipableArmor;
    //TODO
    permaBuffs?: undefined;
}

function calcDamage(rawDamage: number, defence: number) {
    if (defence >= rawDamage) {
        return { rawDamage: rawDamage, damage: 0, mitigated: rawDamage };
    }
    return { rawDamage: rawDamage, damage: rawDamage - defence, mitigated: defence };
}

export class Entity {
    stats: BaseEntity;
    maxhealth: number;
    lastattack?: number;
    lastdefence?: number;
    itemtext: string[] = [];

    constructor(entity: BaseEntity) {
        this.stats = entity;
        if (this.stats.armor) {
            this.stats.health += this.stats.armor?.health;
        }
        this.maxhealth = this.stats.health;
    }

    attack(enemy: Entity) {
        let rawDamage: number;
        rawDamage = this.stats.baseDamage;
        if (this.stats.weapon) {
            rawDamage += randomValue(this.stats.weapon.attack);
        }
        this.stats.items
            .filter(value => value.attackModifier)
            .forEach(value => (rawDamage += randomValue(value.attackModifier!)));
        let defence = enemy.defend();
        let result = calcDamage(rawDamage, defence);
        console.log(
            this.stats.name +
                " (" +
                this.stats.health +
                ") hits " +
                enemy.stats.name +
                " (" +
                enemy.stats.health +
                ") for " +
                result.damage +
                " mitigated " +
                result.mitigated,
        );
        enemy.stats.health -= result.damage;
        this.lastattack = result.rawDamage;
        return result;
    }

    defend() {
        let defence = this.stats.baseDefence;
        if (this.stats.armor) {
            defence += randomValue(this.stats.armor.defence);
        }
        this.stats.items
            .filter(value => value.defenceModifier)
            .forEach(value => (defence += randomValue(value.defenceModifier!)));
        this.lastdefence = defence;
        return defence;
    }
}

interface Range {
    min: number;
    max: number;
}

interface EquipableItem {
    name: string;
    attackModifier?: Range;
    defenceModifier?: Range;
    afterFight?: (scene: FightScene) => void;
    modifyAttack?: (scene: FightScene) => void;
}

export interface FightScene {
    player: Entity;
    enemy: Entity;
}

let exampleWeapon: EquipableWeapon = { name: "dildo", attack: { min: 3, max: 8 } };
let exampleArmor: EquipableArmor = { name: "nachthemd", defence: { min: 2, max: 5 }, health: 20 };
let healitem: EquipableItem = {
    name: "powerade",
    afterFight: scene1 => {
        if (Math.random() < 0.2) {
            let health = randomValue({ min: 1, max: 5 });
            scene1.player.stats.health += health;
            scene1.player.itemtext.push(healitem!.name + " +" + health + "HP");
            console.log(
                scene1.player.stats.name +
                    " gets healed by " +
                    health +
                    " from item" +
                    healitem.name,
            );
        }
    },
};

type result = "PLAYER" | "ENEMY" | undefined;

function checkWin(fightscene: FightScene): result {
    if (fightscene.player.stats.health < 0) {
        return "ENEMY";
    }
    if (fightscene.enemy.stats.health < 0) {
        return "PLAYER";
    }
}

function randomValue(range: Range) {
    return Math.round(range.min + Math.random() * (range.max - range.min));
}

export async function fight(interactionResponse: InteractionResponse<BooleanCache<CacheType>>) {
    let playerstats = {
        name: "Player",
        health: 80,
        baseDamage: 1,
        baseDefence: 0,
        items: [],
        weapon: exampleWeapon,
    };
    let enemystats = {
        name: "Gudrun die Hexe",
        health: 120,
        baseDamage: 1,
        baseDefence: 1,
        items: [healitem],
        armor: exampleArmor,
    };

    let enemy = new Entity(enemystats);
    let player = new Entity(playerstats);

    let scene: FightScene = {
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
