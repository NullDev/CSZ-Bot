import { randomValue, type Range } from "#service/random.js";

export const fightTemplates: { [name: string]: Equipable } = {
    ayran: {
        type: "item",
        attackModifier: { min: 2, maxExclusive: 3 },
    },
    oettinger: {
        type: "item",
        attackModifier: { min: 1, maxExclusive: 5 },
        defenseModifier: { min: -3, maxExclusive: 0 },
    },
    thunfischshake: {
        type: "item",
        attackModifier: { min: 3, maxExclusive: 5 },
    },
    nachthemd: {
        type: "armor",
        health: 50,
        defense: { min: 2, maxExclusive: 5 },
    },
    eierwaermer: {
        type: "armor",
        health: 30,
        defense: { min: 3, maxExclusive: 5 },
    },
    dildo: {
        type: "weapon",
        attack: { min: 3, maxExclusive: 9 },
    },
    messerblock: {
        type: "weapon",
        attack: { min: 1, maxExclusive: 9 },
    },
};
export const bossMap: { [name: string]: Enemy } = {
    gudrun: {
        name: "Gudrun",
        description: "",
        health: 150,
        baseDamage: 2,
        baseDefense: 0,
        enabled: true,
        armor: {
            name: "Nachthemd",
            ...(fightTemplates.nachthemd as EquipableArmor),
        },
        weapon: {
            name: "Dildo",
            ...(fightTemplates.dildo as EquipableWeapon),
        },
        lossDescription: "",
        winDescription: "",
        items: [],
    },

    deinchef: {
        name: "Deinen Chef",
        description: "",
        health: 120,
        baseDamage: 1,
        baseDefense: 1,
        enabled: false,
        lossDescription: "",
        winDescription: "",
        items: [],
    },
    schutzheiliger: {
        name: "Schutzheiliger der Matjesverkäufer",
        description: "",
        health: 120,
        enabled: false,
        baseDamage: 1,
        baseDefense: 1,
        lossDescription: "",
        winDescription: "",
        items: [],
    },
    rentner: {
        name: "Reeeeeeentner",
        description: "Runter von meinem Rasen, dein Auto muss da weg",
        lossDescription: "",
        winDescription: "",
        health: 200,
        baseDamage: 3,
        baseDefense: 5,
        enabled: false,
        items: [],
    },
    barkeeper: {
        name: "Barkeeper von Nürnia",
        description:
            "Nach deiner Reise durch den Schrank durch kommst du nach Nürnia, wo dich ein freundlicher Barkeeper dich anlächelt " +
            "und dir ein Eimergroßes Fass Gettorade hinstellt. Deine nächste aufgabe ist es ihn im Wetttrinken zu besiegen",
        lossDescription: "",
        winDescription: "",
        health: 350,
        enabled: false,
        baseDamage: 5,
        baseDefense: 5,
        items: [],
    },
};

export const baseStats = {
    description: "",
    health: 80,
    baseDamage: 1,
    baseDefense: 0,
};

export type FightItemType = "weapon" | "armor" | "item";

export type Equipable = EquipableWeapon | EquipableItem | EquipableArmor;

export interface EquipableWeapon {
    type: "weapon";
    attack: Range;
}

export interface EquipableArmor {
    type: "armor";
    defense: Range;
    health: number;
}

export interface FightScene {
    player: Entity;
    enemy: Entity;
}

export interface BaseEntity {
    health: number;
    name: string;
    description: string;
    baseDamage: number;
    baseDefense: number;

    items: (EquipableItem & { name: string })[];
    weapon?: EquipableWeapon & { name: string };
    armor?: EquipableArmor & { name: string };
    //TODO
    permaBuffs?: undefined;
}

export interface Enemy extends BaseEntity {
    enabled: boolean;
    winDescription: string;
    lossDescription: string;
}

export class Entity {
    stats: BaseEntity;
    maxHealth: number;
    lastAttack?: number;
    lastDefense?: number;
    itemText: string[] = [];

    constructor(entity: BaseEntity) {
        this.stats = entity;
        if (this.stats.armor?.health) {
            this.stats.health += this.stats.armor?.health;
        }
        this.maxHealth = this.stats.health;
    }

    attack(enemy: Entity) {
        let rawDamage: number;
        rawDamage = this.stats.baseDamage;
        if (this.stats.weapon?.attack) {
            rawDamage += randomValue(this.stats.weapon.attack);
        }
        for (const value1 of this.stats.items) {
            if (value1.attackModifier) {
                rawDamage += randomValue(value1.attackModifier);
            }
        }
        const defense = enemy.defend();
        const result = calcDamage(rawDamage, defense);
        console.log(
            `${this.stats.name} (${this.stats.health}) hits ${enemy.stats.name} (${enemy.stats.health}) for ${result.damage} mitigated ${result.mitigated}`,
        );
        enemy.stats.health -= result.damage;
        this.lastAttack = result.rawDamage;
        return result;
    }

    defend() {
        let defense = this.stats.baseDefense;
        if (this.stats.armor?.defense) {
            defense += randomValue(this.stats.armor.defense);
        }
        for (const item of this.stats.items) {
            if (item.defenseModifier) {
                defense += randomValue(item.defenseModifier);
            }
        }
        this.lastDefense = defense;
        return defense;
    }
}

export interface EquipableItem {
    type: "item";
    attackModifier?: Range;
    defenseModifier?: Range;
    afterFight?: (scene: FightScene) => void;
    modifyAttack?: (scene: FightScene) => void;
}

function calcDamage(rawDamage: number, defense: number) {
    if (defense >= rawDamage) {
        return { rawDamage: rawDamage, damage: 0, mitigated: rawDamage };
    }
    return { rawDamage: rawDamage, damage: rawDamage - defense, mitigated: defense };
}
