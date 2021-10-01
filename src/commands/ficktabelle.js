// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //


import moment from "moment";
import { getConfig } from "../utils/configHandler";
const config = getConfig();

const FICKTABELLE_URL = "https://cdn.discordapp.com/attachments/620721921767505942/636149543154614272/20160901-164533-Kovrtep-id1487186.png";

/**
 * Sends FUCKTABLE
 * @param {import("discord.js").Client} _client
 * @param {import("discord.js").Message} message
 * @returns {Promise<string | void>}
 */
export const run = async(_client, message, args) => {
    let titles = [
        "informiert sich übers fuggern",
        "bereitet seinen Willie vor",
        "wird eine Straftat begehen 👮",
        "sollte nicht vergessen, den Lümmel zu waschen!"
    ];

    let warnings = [
        "Vergiss nicht, BKA is watching you! 👮",
        "Rot ist Tabu 🚫",
        "Minimum n Gummi drum 🚫👶"
    ];

    const envelope = {
        embed: {
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
        }
    };

    await message.channel.send(envelope);
    await message.delete();
};

export const description = `Sendet die Ficktabelle.\nBenutzung: ${config.bot_settings.prefix.command_prefix}ficktabelle`;
