// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //


import moment from "moment";
import { getConfig } from "../utils/configHandler";
const config = getConfig();

const FICKTABELLE_URL = "https://cdn.discordapp.com/attachments/620721921767505942/636149543154614272/20160901-164533-Kovrtep-id1487186.png";

/**
 * Sends FUCKTABLE
 * @type {import("../types").CommandFunction}
 */
export const run = async(_client, message, args) => {
    let titles = [
        "informiert sich übers Fuggern",
        "bereitet seinen Willie vor",
        "wird eine Straftat begehen 👮",
        "sollte nicht vergessen, den Lümmel zu waschen!",
        "will den Lachs buttern",
        "hat Bock den Lörres reinzuhämmern",
        "will die Fleischpeitsche einsauen"
    ];

    let warnings = [
        "Vergiss nicht, BKA is watching you! 👮",
        "Rot ist Tabu 🚫",
        "Minimum n Gummi drum 🚫👶",
        "Tu nichts, was Assi Toni nicht auch tun würde"
    ];

    const embed = {
        image: {
            url: FICKTABELLE_URL
        },
        timestamp: moment.utc().format(),
        author: {
            name: `${message.author.username} ${titles[Math.max(0, Math.floor(Math.random() * titles.length))]}`,
            icon_url: message.author.displayAvatarURL()
        },
        footer: {
            text: warnings[Math.max(0, Math.floor(Math.random() * warnings.length))]
        }
    };

    await message.channel.send({
        embeds: [embed]
    });
    await message.delete();
};

export const description = `Sendet die Ficktabelle.\nBenutzung: ${config.bot_settings.prefix.command_prefix}ficktabelle`;
