import {
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
    type CommandInteraction,
    EmbedBuilder,
    type Guild,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    userMention,
} from "discord.js";

// @ts-ignore Types are somehow broken :shrug:
import { SplidClient } from "splid-js";

import type { BotContext } from "../context.js";
import type { ApplicationCommand } from "./command.js";
import type { SplidGroup } from "../storage/db/model.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";
import logger from "@log";
import * as splidLink from "../storage/splidLink.js";
import * as splidGroup from "../storage/splidGroup.js";
import * as time from "../utils/time.js";

const createNumberFormatter = (currency: string) =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        signDisplay: "exceptZero",
        currency,
    });

export default class SplidGroupCommand implements ApplicationCommand {
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
                ephemeral: true,
            });
            return;
        }

        if (!command.member || !context.roleGuard.isTrusted(command.member)) {
            await command.reply({
                content: "Hurensohn. Der Command ist nix für dich.",
                ephemeral: true,
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
                throw new Error(`Unknown subcommand ${subCommand}`);
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

            const name = command.options.getString("description-short", false) ?? externalInfo.name;

            if (!name) {
                await command.reply({
                    content: "Der Name darf nicht leer sein du Hurensohn",
                });
                return;
            }

            const longDescription = command.options.getString("description-long", false) ?? null;

            const result = await splidGroup.createSplidGroup(
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
            logger.error(err, "Error while adding Splid group");
            return;
        }
    }

    async handleList(command: ChatInputCommandInteraction) {
        if (!command.guild) {
            return;
        }

        const groups = await splidGroup.findAllGroups(command.guild);

        if (groups.length === 0) {
            await command.reply({
                content:
                    "Es gibt noch keine Splid-Gruppen auf diesem Server. Füge eine mit `/splid add` hinzu.",
                ephemeral: true,
            });
            return;
        }

        const groupsStr = groups.map(g => {
            const formatted = formatGroupCode(g.groupCode);
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
            ephemeral: true,
        });
    }

    async handleShowGroup(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }
        const code = command.options.getString("invite-code", true);
        const group = await splidGroup.findOneByCodeForGuild(command.guild, code);

        if (!group) {
            await command.reply({
                content: `Es gibt keine Splid-Gruppe mit dem Code \`${code}\`. Hurensohn.`,
                ephemeral: true,
            });
            return;
        }

        await command.deferReply();

        const memberData = await fetchExternalMemberData(group);

        const linkedAccounts = await splidLink.matchUsers(
            command.guild,
            new Set(memberData.map(n => n.globalId)),
        );

        const accountBalances = await this.getMemberBalances(group, memberData);
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

    async getMemberBalances(group: SplidGroup, members: readonly SplidMember[]) {
        const entries = await fetchGroupEntries(group);
        if (!entries) {
            return undefined;
        }

        const paymentMatrix = buildPaymentMatrix(members, entries);
        return computeAccountBalances(members, paymentMatrix);
    }

    async handleLink(command: ChatInputCommandInteraction) {
        if (!command.guild || !command.member) {
            return;
        }

        const groupCode = command.options.getString("invite-code", true);
        const group = await splidGroup.findOneByCodeForGuild(command.guild, groupCode);

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

            logger.error(err, "Error while linking Splid person with discord account on guild");
            return;
        }
    }

    async handleDeleteGroup(command: ChatInputCommandInteraction) {
        const code = command.options.getString("invite-code", true);

        await splidGroup.deleteByInviteCode(code);

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

                        const group = await splidGroup.findOneByCodeForGuild(
                            interaction.guild,
                            groupCode,
                        );
                        if (!group) {
                            return;
                        }

                        const memberData = await fetchExternalMemberData(group);

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
                        logger.warn(`Cannot autocomplete "${focused.name}" for sub command "link"`);
                        return;
                }
            }
            default:
                logger.warn(`Cannot autocomplete sub command "${subCommand}" `);
                return;
        }
    }

    async #getSplidGroupCompletions(focusedValue: string, guild: Guild) {
        const groups = await splidGroup.findAllGroups(guild);

        const focusedValueNormalized = focusedValue.toLowerCase();
        return groups
            .filter(n => n.shortDescription.toLowerCase().includes(focusedValueNormalized))
            .map(n => ({
                name: n.shortDescription,
                value: n.groupCode,
            }));
    }
}

type ExternalInfo = { name: string; objectId: string };

async function getExternalGroupInfo(inviteCode: string): Promise<ExternalInfo | undefined> {
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
const memberCacheRetentionMs = time.minutes(1);

type SplidMember = {
    name: string;
    initials: string;
    objectId: string;
    globalId: string;
};

async function fetchExternalMemberDataLive(group: SplidGroup): Promise<SplidMember[]> {
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

async function fetchGroupEntries(group: SplidGroup) {
    const client = new SplidClient({
        installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
    });

    const groupRes = await client.group.getByInviteCode(group.groupCode);
    const groupId = groupRes.result.objectId;
    if (!groupId) {
        return undefined;
    }

    const entriesRes = await client.entry.getByGroup(groupId);
    const entries = entriesRes?.result?.results;
    if (!entries) {
        return undefined;
    }
    return entries as SplidEntry[];
}

type SplidEntry = {
    title: string;
    currencyCode: string;
    primaryPayer: string;
    items: {
        P?: {
            P?: Record<string /* global-id of user */, number /* fraction */>;
        };
        /** amount */
        AM?: number;
    }[];
};

function buildPaymentMatrix(members: readonly SplidMember[], entries: SplidEntry[]) {
    const paymentMatrix = new Map(
        members.map(m => [m.globalId, new Map(members.map(m => [m.globalId, 0]))]),
    );
    const membersMap = new Map(members.map(m => [m.globalId, m]));

    for (const entry of entries) {
        const primaryPayer = membersMap.get(entry.primaryPayer);
        if (!primaryPayer) {
            logger.warn(
                `Could not find primary payer for entry "${entry.title}" (${entry.currencyCode}))`,
            );
            continue;
        }

        for (const item of entry.items) {
            const partsMembers = item.P?.P;
            if (!partsMembers) {
                logger.warn(item, "No partsMembers");
                continue;
            }

            const amount = item.AM;
            if (!amount) {
                logger.warn(item, "No amount");
                continue;
            }

            logger.debug(
                `${primaryPayer.name} paid for "${entry.title}" ${amount} ${entry.currencyCode}`,
            );

            for (const [memberId, parts] of Object.entries(partsMembers)) {
                const member = membersMap.get(memberId);
                if (!member) {
                    logger.warn(`Could not find member for id ${memberId}`);
                    continue;
                }

                logger.debug(
                    `${primaryPayer.name} paid for ${member.name} ${
                        amount * parts
                    } ${entry.currencyCode}`,
                );

                const balanceRow = paymentMatrix.get(primaryPayer.globalId);
                if (!balanceRow) {
                    logger.warn(`Could not find balance row for ${primaryPayer.name}`);
                    continue;
                }

                const memberBalanceForPayer = balanceRow.get(member.globalId) ?? 0;
                balanceRow.set(member.globalId, memberBalanceForPayer + amount * parts);
            }
        }
    }
    return paymentMatrix;
}

function computeAccountBalances(
    members: readonly SplidMember[],
    balanceMatrix: Map<string, Map<string, number>>,
): Record<string, number> {
    const balances: Record<string, number> = {};
    for (const member of members) {
        const payedForOthers = balanceMatrix.get(member.globalId);
        let balance = 0;
        for (const [otherId, payed] of balanceMatrix.entries()) {
            const payedForMe = payed.get(member.globalId);
            if (payedForMe !== undefined) {
                balance -= payedForMe; // other payed for me
            }

            const payedForHim = payedForOthers?.get(otherId);
            if (payedForHim !== undefined) {
                balance += payedForHim; // me payed for him
            }
        }

        balances[member.globalId] = balance;
    }
    return balances;
}

function formatGroupCode(code: string) {
    const normalized = code.replace(/\s/g, "").toUpperCase().trim();

    const parts = [];
    for (let i = 0; i < normalized.length; i += 3) {
        parts.push(normalized.substring(i, i + 3));
    }
    return parts.join(" ");
}
