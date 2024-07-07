import { parseArgs, type ParseArgsConfig } from "node:util";

import type { MessageCommand } from "./command.js";
import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "../service/commandService.js";

import { parseLegacyMessageParts } from "../service/commandService.js";
import { defer } from "../utils/interactionUtils.js";

import { randomEntry } from "../utils/arrayUtils.js";

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

const insults = {
    de: [
        "du Sohn einer ranzigen Hafendirne!",
        "möge dich der Blitz beim scheißen treffen!",
        "du verdammter Troglodyt!",
        "sonst muss ich heute Nacht noch deine Mama besuchen!",
        "dir bau ich gleich ein drittes Fickloch!",
        "dein Stammbaum ist ein Tetradekagon!",
    ],
    en: [
        "you fucking imbecile!",
        "retard!",
        "you troglodyte!",
        "even my brother is more capable and he's a retard!",
    ],
};

export default class MetafrageCommand implements MessageCommand {
    modCommand = false;
    name = "metafrage";
    description =
        "Weist freundlich darauf hin, keine Metafragen zu stellen. -e für englischsprachige Hurensöhne.";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);
        const options = parseArgs({ ...argsConfig, args }).values;

        await using _ = defer(() => message.delete());

        if (args.length !== 0 && (args.length !== 1 || !options.english)) {
            await message.channel.send(
                "Bruder, es gibt genau eine Option und die heißt -e! Versuch gar nicht erst, mich zu verarschen!",
            );
            return;
        }

        if (options.english) {
            const insult = randomEntry(insults.en);
            await message.channel.send(
                `Stop asking meta questions, ${insult}\nIt's a waste of time and stops us from ~~insulting each other~~ working on real problems.\nHere's a few hints on how to do it better: <https://metaquestion.net>`,
            );
            return;
        }

        const insult = randomEntry(insults.de);
        await message.channel.send(
            `Hör auf, Metafragen zu stellen, ${insult}\nDas ist reine Zeitverschwendung und hindert uns nur daran, ~~uns zu beleidigen~~ an echten Problemen zu arbeiten.\nFür Tipps zum besser machen: <http://metafrage.de>`,
        );
    }
}
