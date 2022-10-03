import { Client } from "discord.js";

import { getConfig } from "../utils/configHandler.js";
import { MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";

const config = getConfig();

const FICKTABELLE_URL = "https://cdn.discordapp.com/attachments/620721921767505942/636149543154614272/20160901-164533-Kovrtep-id1487186.png";

const titles = [
    "informiert sich übers Fuggern",
    "bereitet seinen Willie vor",
    "wird eine Straftat begehen 👮",
    "sollte nicht vergessen, den Lümmel zu waschen!",
    "will den Lachs buttern",
    "hat Bock den Lörres reinzuhämmern",
    "will die Fleischpeitsche einsauen"
];

const warnings = [
    "Vergiss nicht, BKA is watching you! 👮",
    "Rot ist Tabu 🚫",
    "Minimum n Gummi drum 🚫👶",
    "Tu nichts, was Assi Toni nicht auch tun würde"
];

export class FicktabelleCommand implements MessageCommand {
    name = "ficktabelle";
    description = `Sendet die Ficktabelle.\nBenutzung: ${config.bot_settings.prefix.command_prefix}ficktabelle`;

    async handleMessage(message: ProcessableMessage, client: Client<boolean>): Promise<void> {
        await message.channel.send({
            embeds: [
                {
                    image: { url: FICKTABELLE_URL },
                    author: {
                        name: `${message.author.username} ${titles[Math.max(0, Math.floor(Math.random() * titles.length))]}`,
                        icon_url: message.author.displayAvatarURL()
                    },
                    footer: {
                        text: warnings[Math.max(0, Math.floor(Math.random() * warnings.length))]
                    }
                }
            ]
        });
        await message.delete();
    }
}
