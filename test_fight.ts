interface EquipableWeapon {
    attack: Range;
}

interface EquipableArmor {
    defence: Range;
    health: number;
}

interface BaseEntity {
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
        return {damage: 0, mitigated: rawDamage};
    }
    return {damage: rawDamage - defence, mitigated: defence};

}

class Entity {
    stats: BaseEntity;

    constructor(entity: BaseEntity) {
        this.stats = entity;
        if (this.stats.armor) {
            this.stats.health += this.stats.armor?.health;
        }
    }

    attack(enemy: Entity) {
        let rawDamage: number;
        rawDamage = this.stats.baseDamage;
        if (this.stats.weapon) {
            rawDamage += randomValue(this.stats.weapon.attack);
        }
        this.stats.items.filter(value => value.attackModifier).forEach(value =>
            rawDamage += randomValue(value.attackModifier!)
        );
        //TODO calc Items and Buffs for player
        let defence = enemy.defend();
        let result = calcDamage(rawDamage, defence);
        console.log(this.stats.name + " (" + this.stats.health + ") hits " +
            enemy.stats.name + " (" + enemy.stats.health + ") for "
            + result.damage + " mitigated " + result.mitigated);
        enemy.stats.health -= result.damage;
    }

    defend() {
        let defence = this.stats.baseDefence;
        if (this.stats.armor) {
            defence += randomValue(this.stats.armor.defence);
        }
        this.stats.items.filter(value => value.defenceModifier).forEach(value =>
            defence += randomValue(value.defenceModifier!)
        );
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


interface FightScene {
    player: Entity;
    enemy: Entity;
}

let exampleWeapon: EquipableWeapon = {attack: {min: 3, max: 8}};
let exampleArmor: EquipableArmor = {defence: {min: 2, max: 5}, health: 20};
let healitem: EquipableItem = {
    name: "powerade",
    afterFight: scene1 => {
        if (Math.random() < 0.2) {
            let health = randomValue({min: 1, max: 5});
            scene1.player.stats.health += health;
            console.log(scene1.player.stats.name + " gets healed by " + health + " from item" + " powerade");
        }
    }
};
let playerstats = {name: "player", health: 80, baseDamage: 1, baseDefence: 0, items: [], weapon: exampleWeapon};
let enemystats = {
    name: "gudrun",
    health: 120,
    baseDamage: 1,
    baseDefence: 1,
    items: [healitem],
    armor: exampleArmor
};

let enemy = new Entity(enemystats);
let player = new Entity(playerstats);

let scene
    :
    FightScene = {
    player: player,
    enemy: enemy
};
while (checkWin(scene) === undefined) {
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

function randomValue(range: Range) {
    return Math.round(range.min + Math.random() * (range.max - range.min));
}


console.log(checkWin(scene));
