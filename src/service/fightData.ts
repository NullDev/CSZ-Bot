export const fightTemplates: { [name: string]: Equipable } = {
    ayran: {
        type: "item",
        attackModifier: {min: 2, max: 3}
    },
    oettinger: {
        type: "item",
        attackModifier: {min: 1, max: 5},
        defenceModifier: {min: -3, max: 0}
    },
    thunfischshake: {
        type: "item",
        attackModifier: {min: 3, max: 5}
    },
    nachthemd: {
        type: "armor",
        health: 50,
        defence: {min: 2, max: 5}
    },
    eierwaermer: {
        type: "armor",
        health: 30,
        defence: {min: 3, max: 5}
    },
    dildo: {
        type: "weapon",
        attack: {min: 3, max: 9}
    },
    messerblock: {
        type: "weapon",
        attack: {min: 1, max: 9}
    }
};
export const bossMap: { [name: string]: (Enemy) } = {
    gudrun: {
        name: "Gudrun",
        description: "",
        health: 150,
        baseDamage: 2,
        baseDefence: 0,
        enabled: true,
        armor: {
            name: "Nachthemd",
            ...fightTemplates.nachthemd as EquipableArmor
        },
        weapon: {
            name: "Dildo",
            ...fightTemplates.dildo as EquipableWeapon
        },
        lossDescription: "",
        winDescription: "",
        items: []
    },

    deinchef: {
        name: "Deinen Chef",
        description: "",
        health: 120,
        baseDamage: 1,
        baseDefence: 1,
        enabled: false,
        lossDescription: "",
        winDescription: "",
        items: []
    },
    schutzheiliger: {
        name: "Schutzheiliger der Matjesverkäufer",
        description: "",
        health: 120,
        enabled: false,
        baseDamage: 1,
        baseDefence: 1,
        lossDescription: "",
        winDescription: "",
        items: []
    },
    rentner: {
        name: "Reeeeeeentner",
        description: "Runter von meinem Rasen, dein Auto muss da weg",
        lossDescription: "",
        winDescription: "",
        health: 200,
        baseDamage: 3,
        baseDefence: 5,
        enabled: false,
        items: []
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
        baseDefence: 5,
        items: []
    }
};

export const baseStats = {
    description: "",
    health: 80,
    baseDamage: 1,
    baseDefence: 0
};

export type FightItemType = "weapon" | "armor" | "item";

export type Equipable = EquipableWeapon | EquipableItem | EquipableArmor;

export interface EquipableWeapon {
    type: "weapon";
    attack: Range;
}

export interface EquipableArmor {
    type: "armor";
    defence: Range;
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
    baseDefence: number;

    items: (EquipableItem & { name: string }) [];
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
    maxhealth: number;
    lastattack?: number;
    lastdefence?: number;
    itemtext: string[] = [];

    constructor(entity: BaseEntity) {
        this.stats = entity;
        if (this.stats.armor?.health) {
            this.stats.health += this.stats.armor?.health;
        }
        this.maxhealth = this.stats.health;
    }

    attack(enemy: Entity) {
        let rawDamage: number;
        rawDamage = this.stats.baseDamage;
        if (this.stats.weapon?.attack) {
            rawDamage += randomValue(this.stats.weapon.attack);
        }
        this.stats.items
            .filter(value => value.attackModifier)
            .forEach(value => (rawDamage += randomValue(value.attackModifier!)));
        const defence = enemy.defend();
        const result = calcDamage(rawDamage, defence);
        console.log(
            `${this.stats.name} (${this.stats.health}) hits ${enemy.stats.name} (${enemy.stats.health}) for ${result.damage} mitigated ${result.mitigated}`
        );
        enemy.stats.health -= result.damage;
        this.lastattack = result.rawDamage;
        return result;
    }

    defend() {
        let defence = this.stats.baseDefence;
        if (this.stats.armor?.defence) {
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

type PermaBuff = {};

export interface EquipableItem {
    type: "item";
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
