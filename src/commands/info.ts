import { Client } from "discord.js";
import { Command } from "./command";
import { SlashCommandBuilder } from '@discordjs/builders';

export class InfoCommand implements Command {
    public get applicationCommand(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName('info')
            .setDescription('Get Bot Info')
    }
}