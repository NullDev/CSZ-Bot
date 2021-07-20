// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { Result, ApplicationCommandDefinition } from "../types";

let fetch = require("node-fetch").default;

async function handler(): Promise<Result> {

    return fetch("https://inspirobot.me/api?generate=true")
        .then((res: Response) => res.text())
        .then((text: string) => {
            return { content: text }
        });

    // return { content: "", ephemeral: true };
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "inspirobot",
            description: "Inspiriert mit einem weisen Spruch"
        }
    }
];
