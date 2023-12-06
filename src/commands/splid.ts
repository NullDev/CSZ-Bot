import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    CommandInteraction,
    EmbedBuilder,
    Guild,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    userMention,
} from "discord.js";

// @ts-ignore Types are somehow broken :shrug:
import { SplidClient } from "splid-js";

import type { ApplicationCommand } from "./command.js";
import { isTrusted } from "../utils/userUtils.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";
import SplidGroup from "../storage/model/SplidGroup.js";
import logger from "../utils/logger.js";
import SplidLink from "../storage/model/SplidLink.js";

export class SplidGroupCommand implements ApplicationCommand {
    modCommand = false;
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
                .setName("show")
                .setDescription(
                    "Listet die aktuellen Mitglieder und Kontostände auf",
                )
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
                .setDescription(
                    "Verknüpft eine Splid-Person mit deinem Discord-Account",
                )
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
                .setName("delete")
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

    async handleInteraction(interaction: CommandInteraction) {
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
            case "link":
                return this.handleLink(command);
            case "delete":
                return this.handleDelete(command);
            default:
                throw new Error(`Unknown subcommand ${subCommand}`);
        }
    }

    async handleAdd(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }

        const inviteCode = command.options.getString("invite-code", true);
        const normalizedCode = inviteCode
            .replace(/\s/g, "")
            .toUpperCase()
            .trim();

        if (normalizedCode.length === 0) {
            await command.reply({
                content: "Invite-Code darf nicht leer sein.",
                ephemeral: true,
            });
            return;
        }

        await command.deferReply();

        try {
            const externalInfo = await getExternalGroupInfo(normalizedCode);
            if (!externalInfo) {
                await command.editReply({
                    content: `Eine Splid-Gruppe mit dem Code \`${normalizedCode}\`konnte nicht gefunden werden. Hurensohn.`,
                });
                return;
            }

            const name =
                command.options.getString("description-short", false) ??
                externalInfo.name;

            if (!name) {
                await command.reply({
                    content: "Der Name darf nicht leer sein du Hurensohn",
                });
                return;
            }

            const longDescription =
                command.options.getString("description-long", false) ?? null;

            const result = await SplidGroup.createSplidGroup(
                command.user,
                command.guild,
                normalizedCode,
                externalInfo.objectId,
                name,
                longDescription,
            );

            await command.editReply({
                content: `Ok Bruder, habe Splid-Gruppe **${result.shortDescription}** mit Invite-Code \`${normalizedCode}\` hinzugefügt.`,
            });
        } catch (err) {
            await command.editReply({
                content:
                    "Hurensohn. Irgendwas ging schief. Schau mal in den Logs.",
            });
            logger.error(err, "Error while adding Splid group");
            return;
        }
    }

    async handleList(command: ChatInputCommandInteraction) {
        if (!command.guild) {
            return;
        }

        const groups = await SplidGroup.findAllGroups(command.guild);

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
                    footer: { text: "Füge eine neue mit /splid add hinzu." },
                }),
            ],
            ephemeral: true,
        });
    }

    async handleShow(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }
        const code = command.options.getString("invite-code", true);
        const group = await SplidGroup.findOneByCodeForGuild(
            command.guild,
            code,
        );

        if (!group) {
            await command.reply({
                content: `Es gibt keine Splid-Gruppe mit dem Code \`${code}\`. Hurensohn.`,
                ephemeral: true,
            });
            return;
        }

        await command.deferReply();

        const memberData = await fetchExternalMemberData(group);

        const linkedAccounts = await SplidLink.matchUsers(
            command.guild,
            new Set(memberData.map(n => n.globalId)),
        );

        function getPrintableDisplayName(splidAccount: SplidMember) {
            const discordUser = linkedAccounts.get(splidAccount.globalId);
            return discordUser ? userMention(discordUser) : splidAccount.name;
        }

        const memberList = memberData.map(n => {
            return `- ${getPrintableDisplayName(n)}`;
        });

        const description = `${
            group.longDescription ?? ""
        }\n\nMitglieder:\n${memberList.join("\n")}`.trim();

        function getBalance(splidAccount: SplidMember): string {
            // TODO: How do we get the balance? It seems that splid computes this on the client side?
            return `${splidAccount.name.length} €`;
        }

        await command.editReply({
            embeds: [
                new EmbedBuilder({
                    title: group.shortDescription,
                    description,
                    // Field names cannot have mentions: https://stackoverflow.com/a/57112737
                    // So we use the balance as name
                    fields: memberData.map(n => ({
                        name: getBalance(n),
                        value: getPrintableDisplayName(n),
                    })),
                }),
            ],
        });
    }

    async handleLink(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }

        const groupCode = command.options.getString("invite-code", true);
        const group = await SplidGroup.findOneByCodeForGuild(
            command.guild,
            groupCode,
        );

        if (!group) {
            await command.reply({
                content: `Es gibt keine Splid-Gruppe mit dem Code \`${groupCode}\`. Hurensohn.`,
                ephemeral: true,
            });
            return;
        }

        const splitPerson = command.options.getString("split-person", true);
        const discordUser = command.options.getUser("discord-user", true);

        await command.deferReply();

        try {
            const memberData = await fetchExternalMemberData(group);

            const splidMember = memberData.find(
                n => n.globalId === splitPerson,
            );

            if (!splidMember) {
                await command.editReply({
                    content: `Es gibt keine Splid-Person mit dem Namen "${splitPerson}" in der Gruppe "${group.shortDescription}" ¯\\_(ツ)_/¯`,
                });
                return;
            }

            const result = await SplidLink.createLink(
                command.guild,
                discordUser,
                splidMember.globalId,
            );

            const mention = userMention(result.discordUserId);
            await command.editReply({
                content: `${mention} ist jetzt auf diesem Server nun mit ${splidMember.name} verknüpft.`,
            });
        } catch (err) {
            await command.editReply({
                content: "Irgendwas ging schief. Schau mal in den Logs.",
            });

            logger.error(
                err,
                "Error while linking Splid person with discord account on guild",
            );
            return;
        }
    }

    async handleDelete(command: ChatInputCommandInteraction) {
        const code = command.options.getString("invite-code", true);

        await SplidGroup.deleteByInviteCode(code);

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
            case "delete":
            case "list":
            case "show": {
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
                        const completions =
                            await this.#getSplidGroupCompletions(
                                focused.value,
                                interaction.guild,
                            );
                        await interaction.respond(completions);
                        return;
                    }
                    case "split-person": {
                        const groupCode = interaction.options.getString(
                            "invite-code",
                            true,
                        );

                        const group = await SplidGroup.findOneByCodeForGuild(
                            interaction.guild,
                            groupCode,
                        );
                        if (!group) {
                            return;
                        }

                        const memberData = await fetchExternalMemberData(group);

                        const completions = memberData
                            .filter(n =>
                                n.name
                                    .toLowerCase()
                                    .includes(focused.value.toLowerCase()),
                            )
                            .map(n => ({
                                name: n.name,
                                value: n.globalId,
                            }));

                        await interaction.respond(completions);
                        return;
                    }
                    // discord-user will be autocompleted by the client automatically
                    default:
                        logger.warn(
                            `Cannot autocomplete "${focused.name}" for sub command "link"`,
                        );
                        return;
                }
            }
            default:
                logger.warn(`Cannot autocomplete sub command "${subCommand}" `);
                return;
        }
    }

    async #getSplidGroupCompletions(focusedValue: string, guild: Guild) {
        const groups = await SplidGroup.findAllGroups(guild);

        const focusedValueNormalized = focusedValue.toLowerCase();
        return groups
            .filter(n =>
                n.shortDescription
                    .toLowerCase()
                    .includes(focusedValueNormalized),
            )
            .map(n => ({
                name: n.shortDescription,
                value: n.groupCode,
            }));
    }
}

type ExternalInfo = { name: string; objectId: string };

async function getExternalGroupInfo(
    inviteCode: string,
): Promise<ExternalInfo | undefined> {
    const client = new SplidClient({
        installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
    });

    const groupRes = await client.group.getByInviteCode(inviteCode);
    const groupId = groupRes.result.objectId;

    const groupInfoRes = await client.groupInfo.getByGroup(groupId);

    const info = groupInfoRes?.result?.results?.[0] ?? undefined;
    if (!info) {
        return undefined;
    }

    const name = (info.name as string | undefined) ?? undefined;
    if (!name) {
        return undefined;
    }

    const objectId = (info.objectId as string | undefined) ?? undefined;
    if (!objectId) {
        return undefined;
    }

    return {
        name,
        objectId,
    };
}

type CacheEntry = {
    created: number;
    data: ReturnType<typeof fetchExternalMemberDataLive>;
};
const memberCache = new Map<string, CacheEntry>();
const memberCacheRetentionMs = 1000 * 60;

type SplidMember = {
    name: string;
    initials: string;
    objectId: string;
    globalId: string;
};

async function fetchExternalMemberDataLive(
    group: SplidGroup,
): Promise<SplidMember[]> {
    const client = new SplidClient({
        installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
    });

    const groupRes = await client.group.getByInviteCode(group.groupCode);
    const groupId = groupRes.result.objectId;

    const membersRes = await client.person.getByGroup(groupId);

    // biome-ignore lint/suspicious/noExplicitAny: splid-js's types are broken here
    const members: any[] = membersRes?.result?.results ?? [];
    return members.map(m => ({
        name: m.name as string,
        initials: m.initials as string,
        objectId: m.objectId as string, // this somehow doesn't cut it. We need to use the globalId
        globalId: m.GlobalId as string,
    }));
}

//#region over-engineered caching

// TODO: maybe make this a factory etc
async function fetchExternalMemberData(
    group: SplidGroup,
): ReturnType<typeof fetchExternalMemberDataLive> {
    const now = Date.now();
    const cached = memberCache.get(group.groupCode);

    if (cached) {
        if (now - cached.created < memberCacheRetentionMs) {
            return cached.data;
        }
        memberCache.delete(group.groupCode);
    }

    // Not awaiting, because we want cache the promise,
    // so every client will get the result instantly and we don't block here plus we won't fetch the result twice
    const data = fetchExternalMemberDataLive(group);

    memberCache.set(group.groupCode, {
        created: now,
        data,
    });

    return data;
}

//#region
