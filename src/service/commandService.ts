import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { BotContext } from "../context.js";
import type { Command } from "../commands/command.js";
import type { LegacyCommand } from "../types.js";

import log from "@log";

const commandExtensions = [".ts", ".js"];

export async function readAvailableCommands(
    context: BotContext,
): Promise<Command[]> {
    const modules = loadRawCommandModules(context, context.commandDir);

    const res = [];
    for await (const module of modules) {
        if (!module.default) {
            continue;
        }
        res.push(new module.default());
    }
    return res;
}

export type LegacyCommandInfo = { name: string; definition: LegacyCommand };

export async function readAvailableLegacyCommands(
    context: BotContext,
    type: "mod" | "pleb",
): Promise<LegacyCommandInfo[]> {
    const dir = type === "mod" ? context.modCommandDir : context.commandDir;
    const modules = loadRawCommandModules(context, dir);

    const res = [];
    for await (const module of modules) {
        if (
            !module.description ||
            module.description !== "string" ||
            typeof module.run !== "function"
        ) {
            continue;
        }

        let fileName = path.basename(module.__filename);
        for (const extension of commandExtensions) {
            if (fileName.endsWith(extension)) {
                fileName = fileName.slice(0, -extension.length);
                break;
            }
        }

        res.push({
            name: fileName,
            definition: module,
        });
    }
    return res;
}

async function* loadRawCommandModules(context: BotContext, commandDir: string) {
    const commandFiles = await fs.readdir(commandDir);

    for (const file of commandFiles) {
        if (!commandExtensions.some(extension => file.endsWith(extension))) {
            continue;
        }

        const moduleUrl = new URL("file://");
        moduleUrl.pathname = path.join(context.commandDir, file);

        // biome-ignore lint/suspicious/noExplicitAny: we need this to handle legacy and new commands
        let module: any;
        try {
            module = await import(moduleUrl.toString());
        } catch (err) {
            log.error(err, `Could not load module "${moduleUrl}"`);
            continue;
        }

        yield module;
    }
}

export async function loadLegacyCommandByName(
    context: BotContext,
    name: string,
    type: "mod" | "pleb",
): Promise<LegacyCommandInfo | undefined> {
    const command = name.toLowerCase();
    const allLegacyCommands = await readAvailableLegacyCommands(context, type);
    log.info(allLegacyCommands, "Legacy commands");
    return allLegacyCommands.find(cmd => cmd.name.toLowerCase() === command);
}
