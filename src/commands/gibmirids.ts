import { ChannelType } from "discord.js";

import type { ProcessableMessage } from "@/service/command.js";
import * as chunkingService from "@/service/chunking.js";
import type { MessageCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";

/**
 * Info command. Displays some useless information about the bot.
 *
 * This command is both - a slash command (application command) and a message command
 */
export default class GibMirIdsCommand implements MessageCommand {
    name = "gibmirids";
    description = "Listet IDs auf dem Server für einfachere Config";

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        if (!context.roleGuard.isTrusted(message.member)) {
            await message.react("❌");
            return;
        }

        try {
            await message.author.send(
                `Hallo, ${message.author.username}!\n\nHier ist eine Liste an IDs:`,
            );
        } catch {
            await message.reply("Ich kann dir keine Nachrichten schicken, wenn du sie blockierst.");
            return;
        }

        const lines = [`# Guild: \`${context.guild.id}\``, ""];

        const channels = [...context.guild.channels.cache.values()].sort(
            (a, b) => Number(a.id) - Number(b.id),
        );

        const channelsByType = Object.groupBy(channels, c => c.type);
        for (const [typeStr, channels] of Object.entries(channelsByType)) {
            const type = Number(typeStr);
            if (type === ChannelType.PublicThread || type === ChannelType.PrivateThread) {
                continue;
            }

            lines.push(`## ${ChannelType[type]}`);
            lines.push(...channels.map(c => `- ${c.name}: \`${c.id}\``));
        }

        lines.push("");
        lines.push("");
        lines.push("## Rollen");

        const roles = [...context.guild.roles.cache.values()].sort(
            (a, b) => b.position - a.position,
        );
        lines.push(...roles.map(r => `- ${r.name}: \`${r.id}\``));

        const chunks = chunkingService.splitInChunks(lines, {
            chunkOpeningLine: "```css",
            chunkClosingLine: "```",
        });

        await Promise.all(chunks.map(chunk => message.author.send(chunk)));
        await message.react("⚙️");
    }
}
