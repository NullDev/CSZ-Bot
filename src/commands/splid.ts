import {
    ActionRowBuilder,
    ApplicationCommandType,
    AutocompleteInteraction,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    CommandInteraction,
    ComponentType,
    ContextMenuCommandBuilder,
    EmbedBuilder,
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
import SplidGroup from "../storage/model/SplidGroup.js";

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

        // TODO Constrain to certain channels?

        const subCommand = command.options.getSubcommand();

        switch (subCommand) {
            case "add":
                return this.handleAdd(command);
            case "list":
                return this.handleList(command);
            case "show":
                return this.handleShow(command);
            case "delete":
                return this.handleDelete(command);
            default:
                throw new Error(`Unknown subcommand ${subCommand}`);
        }
    }
    async handleAdd(command: ChatInputCommandInteraction) {
        command.deferReply();
        throw new Error("Method not implemented.");
    }

    async handleList(command: ChatInputCommandInteraction) {
        if (!command.guildId) {
            return;
        }

        const groups = await SplidGroup.findAllGroups(command.guildId);

        if (groups.length === 0) {
            await command.reply({
                content:
                    "Es gibt noch keine Splid-Gruppen auf diesem Server. Füge eine mit `/splid add` hinzu.",
                ephemeral: true,
            });
            return;
        }

        const groupsStr = groups.map(g =>
            `**\`${g.groupCode}\`**: **${g.shortDescription}**\n${
                g.longDescription ?? ""
            }`.trim(),
        );

        await command.reply({
            embeds: [
                new EmbedBuilder({
                    title: "Splid-Gruppen",
                    description: groupsStr.join("\n\n"),
                    footer: { text: "Füge eine neue mit `/splid add` hinzu." },
                }),
            ],
            ephemeral: true,
        });
    }

    async handleShow(command: ChatInputCommandInteraction) {
        command.deferReply();
        throw new Error("Method not implemented.");
    }
    async handleDelete(command: ChatInputCommandInteraction) {
        const code = command.options.getString("invite-code");
        throw new Error("Method not implemented.");
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.guildId) {
            return;
        }

        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand !== "delete" && subCommand !== "list") {
            return;
        }

        const groups = await SplidGroup.findAllGroups(interaction.guildId);

        const focusedValue = interaction.options.getFocused().toLowerCase();

        const completions = groups
            .filter(n =>
                n.shortDescription.toLowerCase().includes(focusedValue),
            )
            .map(n => ({
                name: n.shortDescription,
                value: n.groupCode,
            }));

        await interaction.respond(completions);
    }
}
