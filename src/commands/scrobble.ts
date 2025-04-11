import {
    type CommandInteraction,
    type CacheType,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
} from "discord.js";

import type { ApplicationCommand, AutocompleteCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import assertNever from "@/utils/assertNever.js";

type SubCommand = "register";

export default class Scrobble implements ApplicationCommand {
    name = "scrobble";
    description = "Hört dir zu, wie du Musik hörst";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("register")
                .setDescription("Registriert dich für's scrobblen"),
        );

    async handleInteraction(command: CommandInteraction<CacheType>, context: BotContext) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const subCommand = command.options.getSubcommand() as SubCommand;

        switch (subCommand) {
            case "register": {
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }
}
