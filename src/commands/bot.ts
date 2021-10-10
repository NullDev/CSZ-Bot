import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import { CommandInteraction, Client } from "discord.js";
import { ApplicationCommand } from "./command";
import { InfoCommand } from "./info";

export class BotCommand implements ApplicationCommand {
    name: string = "bot";
    description: string = "Handles Information to the bot ";
    private _info = new InfoCommand();

    get applicationCommand(): SlashCommandSubcommandsOnlyBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand( subcommand =>
                subcommand
                    .setName("info")
                    .setDescription("Zeigt Informationen über den Bot an")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("activity")
                    .setDescription("Zeigt Informationen zu der Open Source-Aktivität des Bots an"));
    }

    handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<unknown> {
        const subCommand = command.options.getSubcommand();

        switch(subCommand) {
            case "info":
                return this._info.handleInteraction(command, client);
            case "activity":
                throw new Error("Not Yet Implemented");
        }
        throw new Error("Unknown Subcommand");
    }
}

const getActivity = async () => {

}
