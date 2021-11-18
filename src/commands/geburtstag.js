import Birthday from "../storage/model/Birthday";
import { getConfig } from "../utils/configHandler";
import moment from "moment";

import * as log from "../utils/logger";

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

    try {
        await Birthday.insertBirthday(client.user.id, birthday.date(), birthday.month() + 1);
        return `Danke mein G, ich hab dein Geburtstag ${birthday.utc().format("DD.MM.")} eingetragen!`;
    }
    catch(err) {
        log.error(err);
        return "Shit, da ist was schief gegangen - hast du deinen Geburtstag schon eingetragen und bist so dumm das jetzt nochmal zu machen? Piss dich.";
    }
};

export const description = `Trag deinen Geburtstag ein, damit du an deinem Geburtstag die entsprechende Rolle bekommst!\nUsage: ${config.bot_settings.prefix.command_prefix}geburtstag [DD.MM] oder ${config.bot_settings.prefix.command_prefix}geburtstag [DD-MM]`;
