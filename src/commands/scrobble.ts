import {
    type CommandInteraction,
    type CacheType,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandBooleanOption,
} from "discord.js";

import type { ApplicationCommand, AutocompleteCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import assertNever from "@/utils/assertNever.js";
import { setUserRegistration } from "@/service/scrobbler.js";

type SubCommand = "aktivierung";

export default class Scrobble implements ApplicationCommand {
    name = "scrobble";
    description = "Hört dir zu, wie du Musik hörst";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("aktivierung")
                .setDescription("Aktiviert oder deaktiviert dich für's scrobblen")
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName("aktiv")
                        .setDescription("Soll ich dich aktivieren, bruder?"),
                ),
        );

    async handleInteraction(command: CommandInteraction<CacheType>, context: BotContext) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const subCommand = command.options.getSubcommand() as SubCommand;

        switch (subCommand) {
            case "aktivierung": {
                const activated = command.options.getBoolean("aktiv", true);
                await setUserRegistration(command.user, activated);
                await command.reply({
                    content: "Hab ik gemacht, dicker",
                    ephemeral: true,
                });
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }
}
