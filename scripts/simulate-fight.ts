/**
 * Fight simulator — run a boss fight N times and print statistics.
 *
 * Usage:
 *   node scripts/simulate-fight.ts --boss gudrun --n 1000
 *   node scripts/simulate-fight.ts --boss gudrun --n 5000 --weapon dildo --armor nachthemd --items ayran,oettinger
 *
 * Available bosses: gudrun, deinchef, schutzheiliger, rentner, barkeeper
 * Available weapons: dildo, messerblock
 * Available armors:  nachthemd, eierwaermer
 * Available items:   ayran, oettinger, thunfischshake
 */

import {
    baseStats,
    bossMap,
    Entity,
    fightTemplates,
    type BaseEntity,
    type EquipableArmor,
    type EquipableItem,
    type EquipableWeapon,
    type FightScene,
} from "../src/service/fightData.ts";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
    const args: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith("--")) {
            const key = argv[i].slice(2);
            args[key] = argv[i + 1] ?? "true";
            i++;
        }
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));

const bossKey = args["boss"];
const iterations = Math.max(1, Number(args["n"] ?? 1000));
const weaponKey = args["weapon"];
const armorKey = args["armor"];
const itemKeys = args["items"] ? args["items"].split(",") : [];

if (!bossKey || !(bossKey in bossMap)) {
    console.error(`Unknown boss "${bossKey}". Available: ${Object.keys(bossMap).join(", ")}`);
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Build player stats from CLI args
// ---------------------------------------------------------------------------

function buildPlayer(): BaseEntity {
    const weapon =
        weaponKey && weaponKey in fightTemplates && fightTemplates[weaponKey].type === "weapon"
            ? { name: weaponKey, ...(fightTemplates[weaponKey] as EquipableWeapon) }
            : undefined;

    const armor =
        armorKey && armorKey in fightTemplates && fightTemplates[armorKey].type === "armor"
            ? { name: armorKey, ...(fightTemplates[armorKey] as EquipableArmor) }
            : undefined;

    const items = itemKeys
        .filter(k => k in fightTemplates && fightTemplates[k].type === "item")
        .map(k => ({ name: k, ...(fightTemplates[k] as EquipableItem) }));

    return {
        ...baseStats,
        name: "Player",
        weapon,
        armor,
        items,
    };
}

// ---------------------------------------------------------------------------
// Headless fight loop (no Discord, no delays)
// ---------------------------------------------------------------------------

function checkWin(scene: FightScene): "PLAYER" | "ENEMY" | undefined {
    if (scene.player.stats.health < 0) return "ENEMY";
    if (scene.enemy.stats.health < 0) return "PLAYER";
    return undefined;
}

interface FightResult {
    winner: "PLAYER" | "ENEMY";
    playerHp: number;
    enemyHp: number;
    rounds: number;
}

const noop = () => {};

function simulateFight(playerStats: BaseEntity, enemyStats: BaseEntity): FightResult {
    const player = new Entity(structuredClone(playerStats));
    const enemy = new Entity(structuredClone(enemyStats));
    const scene: FightScene = { player, enemy };

    // Suppress the per-hit console.log inside Entity.attack
    const origLog = console.log;
    console.log = noop;

    let rounds = 0;
    while (checkWin(scene) === undefined) {
        player.attack(enemy);
        enemy.attack(player);
        for (const item of player.stats.items) item.afterFight?.(scene);
        for (const item of enemy.stats.items) item.afterFight?.({ player: enemy, enemy: player });
        rounds++;
    }

    console.log = origLog;

    return {
        winner: checkWin(scene)!,
        playerHp: player.stats.health,
        enemyHp: enemy.stats.health,
        rounds,
    };
}

// ---------------------------------------------------------------------------
// Run simulations
// ---------------------------------------------------------------------------

const playerStats = buildPlayer();
const enemyStats = { ...bossMap[bossKey] };

const results: FightResult[] = [];
for (let i = 0; i < iterations; i++) {
    results.push(simulateFight(playerStats, enemyStats));
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function stats(values: number[]) {
    if (values.length === 0) return { avg: 0, min: 0, max: 0 };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { avg, min: Math.min(...values), max: Math.max(...values) };
}

const wins = results.filter(r => r.winner === "PLAYER");
const losses = results.filter(r => r.winner === "ENEMY");

const winRate = (wins.length / iterations) * 100;

const playerHpOnWin = stats(wins.map(r => r.playerHp));
const enemyHpOnLoss = stats(losses.map(r => r.enemyHp));
const roundStats = stats(results.map(r => r.rounds));

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const playerDesc = [
    weaponKey ? `weapon=${weaponKey}` : "no weapon",
    armorKey ? `armor=${armorKey}` : "no armor",
    itemKeys.length ? `items=${itemKeys.join(",")}` : "no items",
].join(", ");

console.log(
    `\nFight Simulation: Player vs ${bossMap[bossKey].name} (${iterations.toLocaleString()} runs)`,
);
console.log(`Player: ${playerDesc}`);
console.log(
    `Player HP: ${playerStats.health + (playerStats.armor?.health ?? 0)}  |  Enemy HP: ${enemyStats.health + (enemyStats.armor?.health ?? 0)}`,
);

console.log("\n── Results ──────────────────────────────");
console.log(`  Wins:   ${wins.length.toLocaleString().padStart(6)} (${winRate.toFixed(1)}%)`);
console.log(
    `  Losses: ${losses.length.toLocaleString().padStart(6)} (${(100 - winRate).toFixed(1)}%)`,
);

console.log("\n── Rounds per fight ─────────────────────");
console.log(`  Avg: ${roundStats.avg.toFixed(1)}  Min: ${roundStats.min}  Max: ${roundStats.max}`);

if (wins.length > 0) {
    console.log("\n── Player HP remaining on WIN ───────────");
    console.log(
        `  Avg: ${playerHpOnWin.avg.toFixed(1)}  Min: ${playerHpOnWin.min}  Max: ${playerHpOnWin.max}`,
    );
}

if (losses.length > 0) {
    console.log("\n── Enemy HP remaining on LOSS ───────────");
    console.log(
        `  Avg: ${enemyHpOnLoss.avg.toFixed(1)}  Min: ${enemyHpOnLoss.min}  Max: ${enemyHpOnLoss.max}`,
    );
}

console.log("");
