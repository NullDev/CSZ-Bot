import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { Guild, GuildMember, Message } from "discord.js";
import * as sentry from "@sentry/node";

import type { BotContext } from "#context.ts";
import type { Command } from "#commands/command.ts";

import log from "#log";

const commandExtensions = [".ts", ".js"];
const ignoredExtensions = [".spec.ts", ".test.ts", ".d.ts", ".test.js", ".spec.js"];

export async function readAvailableCommands(context: BotContext): Promise<Command[]> {
    const modules = loadRawCommandModules(context, context.path.commands);

    const res = [];
    for await (const { module } of modules) {
        if (!module.default) {
            continue;
        }
        res.push(new module.default());
    }
    return res;
}

async function* loadRawCommandModules(context: BotContext, commandDir: string) {
    const commandFiles = await fs.readdir(commandDir, { recursive: true });

    for (const file of commandFiles) {
        if (!commandExtensions.some(extension => file.endsWith(extension))) {
            continue;
        }
        if (ignoredExtensions.some(extension => file.endsWith(extension))) {
            continue;
        }

        const filePath = path.join(context.path.commands, file);

        const moduleUrl = new URL("file://");
        moduleUrl.pathname = filePath;

        // biome-ignore lint/suspicious/noExplicitAny: we need this to handle legacy and new commands
        let module: any;
        try {
            module = await import(moduleUrl.toString());
        } catch (err) {
            sentry.captureException(err);
            log.error(err, `Could not load module "${moduleUrl}"`);
            continue;
        }

        yield {
            filePath,
            module,
        };
    }
}

/**
 * A message that the bot can pass to command handlers.
 * For example, it ensures that there is a member (and it's not a DM)
 */
export type ProcessableMessage = Message<true> & {
    member: GuildMember;
    guild: Guild;
};

export function isProcessableMessage(message: Message): message is ProcessableMessage {
    return !!message.member && !!message.guild && message.inGuild();
}

export type CommandType = "mod" | "pleb";

export interface MessageParts {
    type: CommandType;
    prefix: string;
    commandName: string;
    args: string[];
}

/** Argument "parser" for legacy commands. Use `parseArgs` from `node:util` or create an application command instead. */
export function parseLegacyMessageParts(
    context: BotContext,
    message: ProcessableMessage,
): MessageParts {
    const isModCommand = message.content.startsWith(context.prefix.modCommand);
    const prefix = isModCommand ? context.prefix.modCommand : context.prefix.command;

    const args = message.content.slice(prefix.length).trim().split(/\s+/g);
    const commandName = args.shift();
    return {
        type: isModCommand ? "mod" : "pleb",
        prefix,
        commandName: commandName ?? "",
        args,
    };
}
