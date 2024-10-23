import {FightScene} from "@/commands/fight.js";


export const gameWeapons: { [name: string]: EquipableWeapon } = {
    dildo: {
        type: "weapon",
        name: "Dildo",
        attack: {min: 3, max: 9}
    }
};
export const gameArmor: { [name: string]: EquipableArmor } = {
    nachthemd: {
        type: "armor",
        name: "Nachthemd",
        health: 50,
        defence: {min: 2, max: 5}
    },
    eierwaermer: {
        type: "armor",
        name: "Eierwaermer",
        health: 30,
        defence: {min: 3, max: 5}
    }
};
export const gameItems: { [name: string]: EquipableItem } = {
    ayran: {
        type: "item",
        name: "Ayran",
        attackModifier: {min: 2, max: 3}
    },
    oettinger: {
        type: "item",
        name: "Ötti",
        attackModifier: {min: 1, max: 5},
        defenceModifier: {min: -3, max: 0}
    }
};
export const bossMap: { [name: string]: BaseEntity } = {
    gudrun: {
        name: "Gudrun die Hexe",
        description: "",
        health: 150,
        baseDamage: 2,
        baseDefence: 0,
        armor: gameArmor.nachthemd,
        weapon: gameWeapons.dildo,
        items: []
    },

    deinchef: {
        name: "Deinen Chef",
        description: "",
        health: 120,
        baseDamage: 1,
        baseDefence: 1,
        items: []
    },
    schutzheiliger: {
        name: "Schutzheiliger der Matjesverkäufer",
        description: "",
        health: 120,
        baseDamage: 1,
        baseDefence: 1,
        items: []
    },
    rentner: {
        name: "Reeeeeeentner",
        description: "Runter von meinem Rasen, dein Auto muss da weg",
        health: 200,
        baseDamage: 3,
        baseDefence: 5,
        items: []
    },
    barkeeper: {
        name: "Barkeeper aus Nürnia",
        description: "Nach deiner Reise durch den Schrank durch kommst du nach Nürnia, wo dich ein freundlicher Barkeeper dich anlächelt " +
            "und dir ein Eimergroßes Fass Gettorade hinstellt. Deine nächste aufgabe ist es ihn im Wetttrinken zu besiegen",
        health: 350,
        baseDamage: 5,
        baseDefence: 5,
        items: []
    }
};

export type Equipable = EquipableWeapon | EquipableItem | EquipableArmor;

interface EquipableWeapon {
    type: "weapon";
    attack: Range;
    name: string;
}

interface EquipableArmor {
    type: "armor";
    defence: Range;
    health: number;
    name: string;
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
    baseDefence: number;
    items: EquipableItem[];
    weapon?: EquipableWeapon;
    armor?: EquipableArmor;
    //TODO
    permaBuffs?: undefined;
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
        const defence = enemy.defend();
        const result = calcDamage(rawDamage, defence);
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
            result.mitigated
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

export interface Range {
    min: number;
    max: number;
}

interface EquipableItem {
    type: "item";
    name: string;
    attackModifier?: Range;
    defenceModifier?: Range;
    afterFight?: (scene: FightScene) => void;
    modifyAttack?: (scene: FightScene) => void;
}

function randomValue(range: Range) {
    return Math.round(range.min + Math.random() * (range.max - range.min));
}

function calcDamage(rawDamage: number, defence: number) {
    if (defence >= rawDamage) {
        return {rawDamage: rawDamage, damage: 0, mitigated: rawDamage};
    }
    return {rawDamage: rawDamage, damage: rawDamage - defence, mitigated: defence};
}

