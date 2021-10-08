import { Client, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';

// Abstract class, beacause it's technically the same thing as an
// interface, but can have a constructor, which we require for the
// applicationcommand name
export abstract class Command {
    constructor(public name: string) {}

    abstract get applicationCommand(): SlashCommandBuilder;
    abstract handle(command: CommandInteraction, client: Client): Promise<unknown>;
}
