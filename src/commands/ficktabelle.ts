import * as fs from "node:fs/promises";

import type { MessageCommand } from "#/commands/command.ts";
import type { ProcessableMessage } from "#/service/command.ts";
import { randomEntry } from "#/service/random.ts";

const titles = [
    "informiert sich übers Fuggern",
    "bereitet seinen Willie vor",
    "wird eine Straftat begehen 👮",
    "sollte nicht vergessen, den Lümmel zu waschen!",
    "will den Lachs buttern",
    "hat Bock den Lörres reinzuhämmern",
    "will die Fleischpeitsche einsauen",
];

const warnings = [
    "Vergiss nicht, BKA is watching you! 👮",
    "Rot ist Tabu 🚫",
    "Minimum n Gummi drum 🚫👶",
    "Tu nichts, was Assi Toni nicht auch tun würde",
];

export default class FicktabelleCommand implements MessageCommand {
    name = "ficktabelle";
    description = "Sendet die Ficktabelle.";

    async handleMessage(message: ProcessableMessage) {
        const title = randomEntry(titles);

        await message.channel.send({
            embeds: [
                {
                    image: { url: "attachment://ficktabelle.png" },
                    author: {
                        name: `${message.author.username} ${title}`,
                        icon_url: message.author.displayAvatarURL(),
                    },
                    footer: {
                        text: randomEntry(warnings),
                    },
                },
            ],
            files: [
                {
                    name: "ficktabelle.png",
                    attachment: await fs.readFile("assets/ficktabelle.png"),
                },
            ],
        });
        await message.delete();
    }
}
