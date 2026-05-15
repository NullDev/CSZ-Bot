import * as fs from "node:fs/promises";

import type { MessageCommand } from "#/commands/command.ts";
import type { ProcessableMessage } from "#/service/command.ts";
import { randomEntry } from "#/service/random.ts";

const titles = [
    "informiert sich über die Preise",
    "bereitet die Bong vor",
    "wird eine Straftat begehen 👮",
    "sollte nicht vergessen, jemanden zu fragen der Ahnung hat!",
    "will sich die Birne wegballern",
    "hat Bock heftig drauf zu sein",
    "will ordentlich reinhauen",
    "wird gleich abheben",
];

const warnings = [
    "Vergiss nicht, BKA is watching you! 👮",
    "Finger weg von harten Drogen 🚫",
    "Immer auf die Dosis achten 🚫💀",
    "Tu nichts, was du morgen bereust",
];

export default class BallermatrixCommand implements MessageCommand {
    name = "ballermatrix";
    description = "Sendet die Ballermatrix.";

    async handleMessage(message: ProcessableMessage) {
        const title = randomEntry(titles);

        await message.channel.send({
            embeds: [
                {
                    image: { url: "attachment://ballermatrix.png" },
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
                    name: "ballermatrix.png",
                    attachment: await fs.readFile("assets/ballermatrix.png"),
                },
            ],
        });
        await message.delete();
    }
}
