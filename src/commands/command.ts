import { Client } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';

export interface Command {
    get applicationCommand(): SlashCommandBuilder
}