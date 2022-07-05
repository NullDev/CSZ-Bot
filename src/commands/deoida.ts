import type { CommandFunction } from "../types";

type Rule = {
    pattern: RegExp;
    /** Direct translation or a replacer function (see replaceAll) */
    translation: string | ((substring: string, ...args: any[]) => string);
}

const simpleRules: readonly Rule[] = [
    {
        pattern: /(^|\s+)a(\s+|$)/,
        translation: "ein"
    },
    {
        pattern: /(^|\s+)i(\s+|$)/,
        translation: "ich"
    },
    {
        pattern: /(^|\s+)I(\s+|$)/,
        translation: "Ich"
    }
];


async function deOidaLine(line: string): Promise<string> {
    // We cannot just split all words using \s*. That could tear apart words or translations like "fescher bub"
    // Also, we need to take line breaks into account. We assume that tokens that are one translation unit
    // won't get torn apart by a line break.
    // This also reduces the number of combinations to check
    // TODO: Look up something in database

    let result = line;
    for (const { pattern, translation } of simpleRules) {
        result = result.replaceAll(pattern, translation as string);
    }
    return result;
}

async function deOida(value: string): Promise<string> {
    const lines = value.split("\n")
        .map(s => s.trim())
        .map(deOidaLine);

    const translatedLines = await Promise.all(lines);

    return translatedLines.join("\n");
}

export const run: CommandFunction = async (_client, message, args, _context) => {
    const messageToTranslate = message.reference?.messageId
        ? (await message.channel.messages.fetch(message.reference.messageId))
        : message;

    if (!messageToTranslate) {
        return "Nichts zum Übersetzen da :question:";
    }

    const textToTranslate = messageToTranslate === message
        ? args.join(" ")
        : messageToTranslate.content;

    if (!textToTranslate) {
        return "Nichts zum Übersetzen da :question:";
    }

    const translation = await deOida(textToTranslate);

    await messageToTranslate.reply(`🇦🇹 -> 🇩🇪: ${translation}`);
};

export const description = `
Wendet super komplexes De-Oidering an.
Usage: Mit dem Command auf eine veroiderte (🇦🇹) Nachricht antworten. Alternativ den zu de-oiderten Text übergeben.
`.trim();
