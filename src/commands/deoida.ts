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


function deOida(value: string): Promise<string> {
    let result = value;
    for (const { pattern, translation } of simpleRules) {
        result = result.replaceAll(pattern, translation as string);
    }

    // TODO: Look up something in database

    return Promise.resolve(result);
}

export const run: CommandFunction = async(_client, message, _args, _context) => {
    const messageToTranslate = message.reference?.messageId
        ? (await message.channel.messages.fetch(message.reference.messageId))
        : message;

    if (!messageToTranslate) {
        return "Nichts zum Übersetzen da :question:";
    }

    const translation = await deOida(messageToTranslate.content);

    await messageToTranslate.reply(`🇦🇹 -> 🇩🇪: ${translation}`);
};

export const description = `
Wendet super komplexes De-Oidering an.
Usage: Mit dem Command auf eine veroiderte (🇦🇹) Nachricht antworten. Alternativ den zu de-oiderten Text übergeben.
`.trim();
