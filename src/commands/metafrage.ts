import { parseArgs, type ParseArgsConfig } from "node:util";

import type { CommandFunction } from "../types.js";
import { randomEntry } from "src/utils/arrayUtils.js";

const argsConfig = {
    options: {
        english: {
            type: "boolean",
            short: "c",
            default: false,
            multiple: false,
        },
    },
} satisfies ParseArgsConfig;

/**
 * Sends instructions on how to ask better questions
 */
export const run: CommandFunction = async (message, args) => {
    const { values: options } = parseArgs({ ...argsConfig, args });

    if (args.length === 0 || (args.length === 1 && options.english)) {
        // insult collections, feel free to expand
        const germanInsults: string[] = [
            "du Sohn einer ranzigen Hafendirne!",
            "möge dich der Blitz beim scheißen treffen!",
            "du verdammter Troglodyt!",
            "sonst muss ich heute Nacht noch deine Mama besuchen!",
            "dir bau ich gleich ein drittes Fickloch!",
            "dein Stammbaum ist ein Tetradekagon!",
        ];
        const englishInsults: string[] = [
            "you fucking imbecile!",
            "retard!",
            "you troglodyte!",
            "even my brother is more capable and he's a retard!",
        ];

        if (options.english) {
            const insult = randomEntry(englishInsults);
            await message.channel.send(
                `Stop asking meta questions, ${insult}\nIt's a waste of time and stops us from ~~insulting each other~~ working on real problems.\nHere's a few hints on how to do it better: <https://metaquestion.net>`,
            );
        } else {
            const insult = randomEntry(germanInsults);
            await message.channel.send(
                `Hör auf, Metafragen zu stellen, ${insult}\nDas ist reine Zeitverschwendung und hindert uns nur daran, ~~uns zu beleidigen~~ an echten Problemen zu arbeiten.\nFür Tipps zum besser machen: <http://metafrage.de>`,
            );
        }
    } else {
        await message.channel.send(
            "Bruder, es gibt genau eine Option und die heißt -e! Versuch gar nicht erst, mich zu verarschen!",
        );
    }
    await message.delete();
};

export const description =
    "Weist freundlich darauf hin, keine Metafragen zu stellen. -e für englischsprachige Hurensöhne.";
