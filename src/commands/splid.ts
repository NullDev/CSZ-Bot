import {
    ActionRowBuilder,
    ApplicationCommandType,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    CommandInteraction,
    ComponentType,
    ContextMenuCommandBuilder,
    Message,
    Role,
    RoleSelectMenuBuilder,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    Snowflake,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { ApplicationCommand } from "./command.js";
import { isTrusted } from "../utils/userUtils.js";
import { chunkArray } from "../utils/arrayUtils.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";

export class SplidGroupCommand implements ApplicationCommand {
    name = "splid";
    description = "Managed ein bisschen Splid";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add")
                .setDescription("Fügt eine neue Splid-Gruppe hinzu")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("invite-code")
                        .setDescription("Der Invite-Code der Splid-Gruppe"),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(false)
                        .setName("description-short")
                        .setDescription(
                            "Kurzbeschreibung der Splid-Gruppe. Maximal 69 Zeichen. Default ist der Splid-Gruppen-Name.",
                        ),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(false)
                        .setName("description-long")
                        .setDescription(
                            "Kurzbeschreibung der Splid-Gruppe. Maximal 1000 Zeichen.",
                        ),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Listet alle Splid-Gruppen auf"),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("show")
                .setDescription(
                    "Listet die aktuellen Mitglieder und Kontostände auf",
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("invite-code")
                        .setDescription("Der Invite-Code der Splid-Gruppe")
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("delete")
                .setDescription(
                    "Löscht eine Splid-Gruppe aus Discord. Die Gruppe an sich bleibt bestehen.",
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("invite-code")
                        .setDescription("Der Invite-Code der Splid-Gruppe")
                        .setAutocomplete(true),
                ),
        );

    async handleInteraction(
        interaction: CommandInteraction,
        client: Client,
        context: BotContext,
    ) {
        const command = ensureChatInputCommand(interaction);
        if (!command.guildId) {
            await command.reply({
                content: "Dieser Command kann nur in Servern benutzt werden.",
                ephemeral: true,
            });
            return;
        }

        if (!command.member || !isTrusted(command.member)) {
            await command.reply({
                content: "Hurensohn. Der Command ist nix für dich.",
                ephemeral: true,
            });
            return;
        }

        const subCommand = command.options.getSubcommand();

        switch (subCommand) {
            case "add":
                return this.handleAdd(command, context);
            case "list":
                return this.handleList(command, context);
            case "show":
                return this.handleShow(command, context);
            case "delete":
                return this.handleDelete(command, context);
            default:
                throw new Error(`Unknown subcommand ${subCommand}`);
        }
    }
    async handleAdd(
        command: ChatInputCommandInteraction<CacheType>,
        context: BotContext,
    ) {
        throw new Error("Method not implemented.");
    }
    async handleList(
        command: ChatInputCommandInteraction<CacheType>,
        context: BotContext,
    ) {
        throw new Error("Method not implemented.");
    }
    async handleShow(
        command: ChatInputCommandInteraction<CacheType>,
        context: BotContext,
    ) {
        throw new Error("Method not implemented.");
    }
    async handleDelete(
        command: ChatInputCommandInteraction<CacheType>,
        context: BotContext,
    ) {
        throw new Error("Method not implemented.");
    }
}
