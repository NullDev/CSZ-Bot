import Birthday from "../storage/model/Birthday";
import { getConfig } from "../utils/configHandler";
const config = getConfig();

/**
 * Moderader können User stempeln, die andere User eingeladen haben
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    if (args.length !== 1) return "Bruder gib einfach nur dein Geburtsdatum an!";

    let bdayInput = args[0];
    let pattern = /^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/;

    if (!pattern.test(bdayInput)) return "Dawg, ich brauchs im Format [dd.mm.yyyy] oder [dd/mm/yyyy]";

    let birthday = new Date(bdayInput.replace(pattern, "$3-$2-$1"));

    let addedBirthday = await Birthday.insertBirthday(client.user.id, birthday);

    if(addedBirthday === null) return "Shit, irgendwas hat nicht geklappt beim speichern...";

    return addedBirthday
        ? `Danke mein G, ich hab dein Geburtstag ${birthday} eingetragen!`
        : "Oida, bist du echt so dumm und hast beim ersten Mal das falsche Datum eingetragen? Frag nen Mod um Hilfe";
};

export const description = `Trag deinen Geburtstag ein, damit du an deinem Geburtstag die entsprechende Rolle bekommst!\nUsage: ${config.bot_settings.prefix.command_prefix}geburtstag dd.mm.yyyy oder ${config.bot_settings.prefix.command_prefix}geburtstag dd/mm/yyyy`;
