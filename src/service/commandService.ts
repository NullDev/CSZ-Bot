import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { Guild, GuildMember, Message } from "discord.js";

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
    for await (const { module } of modules) {
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
    for await (const { filePath, module } of modules) {
        if (
            typeof module.description !== "string" ||
            typeof module.run !== "function" ||
            !module.description
        ) {
            continue;
        }

        const fileName = path.basename(filePath);
        res.push({
            name: removeExtension(fileName, commandExtensions),
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

        const filePath = path.join(context.commandDir, file);

        const moduleUrl = new URL("file://");
        moduleUrl.pathname = filePath;

        // biome-ignore lint/suspicious/noExplicitAny: we need this to handle legacy and new commands
        let module: any;
        try {
            module = await import(moduleUrl.toString());
        } catch (err) {
            log.error(err, `Could not load module "${moduleUrl}"`);
            continue;
        }

        yield {
            filePath,
            module,
        };
    }
}

function removeExtension(
    fileName: string,
    extensions: readonly string[],
): string {
    for (const extension of extensions) {
        if (fileName.endsWith(extension)) {
            return fileName.slice(0, -extension.length);
        }
    }
    return fileName;
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

/**
 * A message that the bot can pass to command handlers.
 * For example, it ensures that there is a member (and it's not a DM)
 */
export type ProcessableMessage = Message<true> & {
    member: GuildMember;
    guild: Guild;
};

export function isProcessableMessage(
    message: Message,
): message is ProcessableMessage {
    return !!message.member && !!message.guild && message.inGuild();
}
