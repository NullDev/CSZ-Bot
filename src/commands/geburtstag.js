import Birthday from "../storage/model/Birthday";
import { getConfig } from "../utils/configHandler";
import moment from "moment";
const config = getConfig();

/**
 * User kann sein Geburtstag speichern
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    if (args.length !== 1) return "Bruder gib einfach nur dein Geburtsdatum an!";

    let bdayInput = args[0];

    let birthday = moment.utc(bdayInput, ["DD.MM", "DD.MM.", "DD-MM"]);

    if (!birthday.isValid()) return "Dawg, ich brauchs im Format [DD.MM] oder [DD-MM]";

    let addedBirthday = await Birthday.insertBirthday(client.user.id, birthday.date(), birthday.month() + 1);

    if(addedBirthday === null) return "Shit, irgendwas hat nicht geklappt beim speichern...";

    return addedBirthday
        ? `Danke mein G, ich hab dein Geburtstag ${birthday.utc().format("DD.MM.")} eingetragen!`
        : "Oida, bist du echt so dumm und hast beim ersten Mal das falsche Datum eingetragen? Frag nen Mod um Hilfe";
};

export const description = `Trag deinen Geburtstag ein, damit du an deinem Geburtstag die entsprechende Rolle bekommst!\nUsage: ${config.bot_settings.prefix.command_prefix}geburtstag [DD.MM] oder ${config.bot_settings.prefix.command_prefix}geburtstag [DD-MM]`;
