import {
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
    type CommandInteraction,
    EmbedBuilder,
    type Guild,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    userMention,
} from "discord.js";
import * as sentry from "@sentry/node";

import type { BotContext } from "#/context.ts";
import type { ApplicationCommand, AutocompleteCommand } from "#/commands/command.ts";
import type { SplidMember } from "#/service/splid.ts";

import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";
import * as splidLink from "#/storage/splidLink.ts";
import * as splidService from "#/service/splid.ts";
import log from "#log";

const createNumberFormatter = (currency: string) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        signDisplay: "exceptZero",
        currency,
    });

export default class SplidGroupCommand implements ApplicationCommand, AutocompleteCommand {
    name = "splid";
    description = "Managed ein bisschen Splid";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add-group")
                .setDescription("Fügt eine neue Splid-Gruppe hinzu")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("invite-code")
                        .setNameLocalizations({
                            // name instead of code is intentional,
                            // since autocomplete only shows the name (but sends the code)
                            "en-US": "code",
                            de: "einladungscode",
                        })
                        .setDescription("Der Invite-Code der Splid-Gruppe"),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(false)
                        .setName("description-short")
                        .setDescription(
                            "Name der Splid-Gruppe. Maximal 69 Zeichen. Unique. Default ist der Name der Splid-Gruppe.",
                        ),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(false)
                        .setName("description-long")
                        .setDescription(
                            "Lange Beschreibung der Splid-Gruppe. Maximal 1000 Zeichen.",
                        ),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Listet alle Splid-Gruppen auf diesem Server"),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("show-group")
                .setDescription("Listet die aktuellen Mitglieder und Kontostände auf")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("invite-code")
                        .setNameLocalizations({
                            // name instead of code is intentional,
                            // since autocomplete only shows the name (but sends the code)
                            "en-US": "group",
                            de: "gruppenname",
                        })
                        .setDescription("Der Invite-Code der Splid-Gruppe")
                        // TODO: Name or code?
                        // .setName("description-short")
                        // .setDescription("Der Name der Splid-Gruppe")
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("link")
                .setDescription("Verknüpft eine Splid-Person mit deinem Discord-Account")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setName("invite-code")
                        .setNameLocalizations({
                            // name instead of code is intentional,
                            // since autocomplete only shows the name (but sends the code)
                            "en-US": "group",
                            de: "gruppenname",
                        })
                        .setDescription("Der Invite-Code der Splid-Gruppe"),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setName("split-person")
                        .setNameLocalizations({
                            // name instead of code is intentional,
                            // since autocomplete only shows the name (but sends the code)
                            "en-US": "person",
                            de: "person",
                        })
                        .setDescription("Dein Name in der Splid-Gruppe"),
                )
                .addUserOption(
                    new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("discord-user")
                        .setNameLocalizations({
                            "en-US": "user",
                            de: "user",
                        })
                        .setDescription("Der Discord-User"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("delete-group")
                .setDescription(
                    "Löscht eine Splid-Gruppe aus Discord. Die Gruppe an sich bleibt bestehen.",
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("invite-code")
                        .setNameLocalizations({
                            "en-US": "group",
                            de: "gruppenname",
                        })
                        .setDescription("Der Invite-Code der Splid-Gruppe")
                        .setAutocomplete(true),
                ),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const command = ensureChatInputCommand(interaction);
        if (!command.guildId) {
            await command.reply({
                content: "Dieser Command kann nur in Servern benutzt werden.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!command.member || !context.roleGuard.isTrusted(command.member)) {
            await command.reply({
                content: "Hurensohn. Der Command ist nix für dich.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // TODO Constrain to certain channels?

        const subCommand = command.options.getSubcommand();

        switch (subCommand) {
            case "add-group":
                return this.handleAddGroup(command);
            case "list":
                return this.handleList(command);
            case "show-group":
                return this.handleShowGroup(command);
            case "link":
                return this.handleLink(command);
            case "delete-group":
                return this.handleDeleteGroup(command);
            default:
                throw new Error(`Unknown subcommand "${subCommand}"`);
        }
    }

    async handleAddGroup(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }

        const inviteCode = command.options.getString("invite-code", true);
        const normalizedCode = inviteCode.replace(/\s/g, "").toUpperCase().trim();

        if (normalizedCode.length === 0) {
            await command.reply({
                content: "Invite-Code darf nicht leer sein.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.deferReply();

        try {
            const externalInfo = await splidService.getExternalGroupInfo(normalizedCode);
            if (!externalInfo) {
                await command.editReply({
                    content: `Eine Splid-Gruppe mit dem Code \`${normalizedCode}\`konnte nicht gefunden werden. Hurensohn.`,
                });
                return;
            }

            const name = command.options.getString("description-short", false) ?? externalInfo.name;

            if (!name) {
                await command.reply({
                    content: "Der Name darf nicht leer sein du Hurensohn",
                });
                return;
            }

            const longDescription = command.options.getString("description-long", false) ?? null;

            const result = await splidService.createGroup(
                command.user,
                command.guild,
                normalizedCode,
                name,
                longDescription,
            );

            await command.editReply({
                content: `Ok Bruder, habe Splid-Gruppe **${result.shortDescription}** mit Invite-Code \`${normalizedCode}\` hinzugefügt.`,
            });
        } catch (err) {
            await command.editReply({
                content: "Hurensohn. Irgendwas ging schief. Schau mal in den Logs.",
            });
            log.error(err, "Error while adding Splid group");
            sentry.captureException(err);
            return;
        }
    }

    async handleList(command: ChatInputCommandInteraction) {
        if (!command.guild) {
            return;
        }

        const groups = await splidService.getAllGroups(command.guild);

        if (groups.length === 0) {
            await command.reply({
                content:
                    "Es gibt noch keine Splid-Gruppen auf diesem Server. Füge eine mit `/splid add` hinzu.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const groupsStr = groups.map(g => {
            const formatted = splidService.formatGroupCode(g.groupCode);
            const link = `http://splid.net/j/${g.groupCode}`;
            const desc = g.longDescription ?? "";

            return `**[\`${formatted}\`](${link})**: **${g.shortDescription}**\n${desc}`.trim();
        });

        await command.reply({
            embeds: [
                new EmbedBuilder({
                    title: "Splid-Gruppen",
                    description: groupsStr.join("\n"),
                    footer: { text: "Füge eine neue mit /splid add hinzu." },
                }),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    async handleShowGroup(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }
        const code = command.options.getString("invite-code", true);
        const group = await splidService.getGroupByCode(command.guild, code);

        if (!group) {
            await command.reply({
                content: `Es gibt keine Splid-Gruppe mit dem Code \`${code}\`. Hurensohn.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.deferReply();

        const memberData = await splidService.fetchExternalMemberData(group);

        const linkedAccounts = await splidLink.matchUsers(
            command.guild,
            new Set(memberData.map(n => n.globalId)),
        );

        const accountBalances = await splidService.getMemberBalances(group, memberData);
        if (!accountBalances) {
            await command.editReply({
                content: "Irgendwas ging schief. Schau mal in den Logs.",
            });
            return;
        }

        function getDisplayName(splidAccount: SplidMember) {
            const discordUser = linkedAccounts.get(splidAccount.globalId);
            return discordUser ? userMention(discordUser) : splidAccount.name;
        }

        const getBalance = (splidAccount: SplidMember): number => {
            return accountBalances[splidAccount.globalId] ?? 0;
        };

        const descriptionPrefix = group.longDescription ? `${group.longDescription}\n\n` : "";

        const formatter = createNumberFormatter("EUR");
        const format = formatter.format.bind(formatter);

        const description = [...memberData]
            .sort((a, b) => getBalance(b) - getBalance(a))
            .map(n => `${getDisplayName(n)}: \`${format(getBalance(n))}\``)
            .join("\n");

        await command.editReply({
            embeds: [
                new EmbedBuilder({
                    title: `Kontostände von ${group.shortDescription}`,
                    description: descriptionPrefix + description,
                    /*
                    // Field names cannot have mentions: https://stackoverflow.com/a/57112737
                    // So we use the balance as name
                    fields: memberData.map(n => ({
                        name: getBalance(n),
                        value: getPrintableDisplayName(n),
                    })),
                    */
                }),
            ],
        });
    }

    async handleLink(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }

        const groupCode = command.options.getString("invite-code", true);
        const group = await splidService.getGroupByCode(command.guild, groupCode);

        if (!group) {
            await command.reply({
                content: `Es gibt keine Splid-Gruppe mit dem Code \`${groupCode}\`. Hurensohn.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const splitPerson = command.options.getString("split-person", true);
        const discordUser = command.options.getUser("discord-user", true);

        await command.deferReply();

        try {
            const memberData = await splidService.fetchExternalMemberData(group);

            const splidMember = memberData.find(n => n.globalId === splitPerson);

            if (!splidMember) {
                await command.editReply({
                    content: `Es gibt keine Splid-Person mit dem Namen "${splitPerson}" in der Gruppe "${group.shortDescription}" ¯\\_(ツ)_/¯`,
                });
                return;
            }

            const result = await splidLink.createLink(
                command.guild,
                discordUser,
                splidMember.globalId,
            );

            const mention = userMention(result.discordUserId);
            await command.editReply({
                content: `${mention} ist jetzt in ${group.shortDescription} auf diesem Server mit ${splidMember.name} verknüpft.`,
            });
        } catch (err) {
            await command.editReply({
                content: "Irgendwas ging schief. Schau mal in den Logs.",
            });

            log.error(err, "Error while linking Splid person with discord account on guild");
            return;
        }
    }

    async handleDeleteGroup(command: ChatInputCommandInteraction) {
        const code = command.options.getString("invite-code", true);

        await splidService.deleteByInviteCode(code);

        await command.reply({
            content: `Ok Bruder, habe Splid-Gruppe mit Invite-Code \`${code}\` gelöscht.`,
        });
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.guild || !interaction.member) {
            return;
        }

        const subCommand = interaction.options.getSubcommand(true);
        switch (subCommand) {
            case "delete-group":
            case "list":
            case "show-group": {
                const completions = await this.#getSplidGroupCompletions(
                    interaction.options.getFocused(),
                    interaction.guild,
                );
                await interaction.respond(completions);
                return;
            }
            case "link": {
                const focused = interaction.options.getFocused(true);

                switch (focused.name) {
                    case "invite-code": {
                        const completions = await this.#getSplidGroupCompletions(
                            focused.value,
                            interaction.guild,
                        );
                        await interaction.respond(completions);
                        return;
                    }
                    case "split-person": {
                        const groupCode = interaction.options.getString("invite-code", true);

                        const group = await splidService.getGroupByCode(
                            interaction.guild,
                            groupCode,
                        );
                        if (!group) {
                            return;
                        }

                        const memberData = await splidService.fetchExternalMemberData(group);

                        const completions = memberData
                            .filter(n => n.name.toLowerCase().includes(focused.value.toLowerCase()))
                            .map(n => ({
                                name: n.name,
                                value: n.globalId,
                            }));

                        await interaction.respond(completions);
                        return;
                    }
                    // discord-user will be autocompleted by the client automatically
                    default:
                        log.warn(`Cannot autocomplete "${focused.name}" for sub command "link"`);
                        return;
                }
            }
            default:
                log.warn(`Cannot autocomplete sub command "${subCommand}" `);
                return;
        }
    }

    async #getSplidGroupCompletions(focusedValue: string, guild: Guild) {
        const groups = await splidService.getAllGroups(guild);

        const focusedValueNormalized = focusedValue.toLowerCase();
        return groups
            .filter(n => n.shortDescription.toLowerCase().includes(focusedValueNormalized))
            .map(n => ({
                name: n.shortDescription,
                value: n.groupCode,
            }));
    }
}
