import { cleanContent, type APIEmbed, type TextChannel, type User } from "discord.js";

export async function rollInChannel(
    author: User,
    targetChannel: TextChannel,
    throwCount: number,
    diceSides: number,
) {
    const diceName = `${throwCount}d${diceSides}`;
    const embed = {
        title: cleanContent(`${diceName}:`, targetChannel),
        timestamp: new Date().toISOString(),
        author: {
            name: `Würfel Resultat für ${author.username}`,
            icon_url: author.displayAvatarURL(),
        },
        color: randomNumberBetween(0, 0xfffffe),
        description: constructResultStr(diceResult(throwCount, diceSides)),
    } satisfies APIEmbed;

    await targetChannel.send({
        embeds: [embed],
    });
}

/**
 * Creates the dice throws based on a simple rng
 *
 * @param diceAmount
 * @param diceSides
 *
 * @returns diceResult of the thrown dice
 */
function diceResult(diceAmount: number, diceSides: number): number[] {
    const res = [];
    for (let i = 0; i < diceAmount; ++i) {
        res.push(randomNumberBetween(1, diceSides));
    }

    return res;
}

/**
 * Creates the final description of the embed
 *
 * @param {Array} rolls
 *
 * @returns {string} the constructed result
 */
function constructResultStr(rolls: readonly number[]): string {
    let res = "";

    for (let i = 0; i < rolls.length; ++i) {
        res += `Würfel #${i + 1}: ${rolls[i]}\n`;
    }

    return res.trim();
}

/**
 * Creates a pseudo randomly generated number
 */
function randomNumberBetween(min: number, maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive + min);
}
