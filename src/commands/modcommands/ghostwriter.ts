import {
    type CommandInteraction,
    MessageFlags,
    type PermissionsString,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";

import type { ApplicationCommand } from "#/commands/command.js";
import type { BotContext } from "#/context.js";

export default class GhostwriterCommand implements ApplicationCommand {
    name = "gw";
    description = "Goethe sein Vater";
    requiredPermissions: readonly PermissionsString[] = ["BanMembers"];
    lastBlame: Date | null = null;
    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setDefaultMemberPermissions(0)
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(true)
                    .setName("content")
                    .setDescription("Inhalt"),
            )
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(false)
                    .setName("reply")
                    .setDescription("Antwort auf"),
            );
    }

    async handleInteraction(command: CommandInteraction, _context: BotContext): Promise<void> {
        if (!command.isChatInputCommand()) {
            return; // TODO: Solve this on a type level
        }

        const content = command.options.getString("content", true);
        const reply = command.options.getString("reply", false);
        const { channel } = command;

        if (!channel?.isTextBased() || !("guild" in channel)) {
            return;
        }

        const replyMessage = reply ? await channel.messages.fetch(reply) : undefined;
        if (replyMessage) {
            await replyMessage.reply(content);
        } else {
            await channel.send(content);
        }
        await command.reply({ content: "Okay mein Ghoete", flags: MessageFlags.Ephemeral });
    }
}
