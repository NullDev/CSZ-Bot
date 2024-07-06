import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { BotContext } from "../context.js";
import type { Command } from "../commands/command.js";

import log from "@log";

const commandExtensions = [".ts", ".js"];

export async function readAvailableCommands(
    context: BotContext,
): Promise<Command[]> {
    const commandFiles = await fs.readdir(context.commandDir);

    const res = [];

    for (const file of commandFiles) {
        if (!commandExtensions.some(extension => file.endsWith(extension))) {
            continue;
        }

        const moduleUrl = new URL("file://");
        moduleUrl.pathname = path.join(context.commandDir, file);
        log.debug(`Trying to load ${moduleUrl}`);

        const module = await import(moduleUrl.toString());
        if (!module.default) {
            continue;
        }

        const instance = new module.default();
        if (!instance.name) {
            log.warn(instance, `Command ${file} has no name, skipping`);
            continue;
        }

        res.push(instance);
    }

    return res;
}
