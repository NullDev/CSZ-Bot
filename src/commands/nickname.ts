import {
    type CommandInteraction,
    type GuildMember,
    type User,
    type CacheType,
    ButtonStyle,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    ComponentType,
    type AutocompleteInteraction,
    type Snowflake,
    MessageFlags,
} from "discord.js";
import * as sentry from "@sentry/bun";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand, AutocompleteCommand } from "@/commands/command.js";
import log from "@log";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";
import * as nickName from "@/storage/nickName.js";
import * as time from "@/utils/time.js";

type Vote = "YES" | "NO";

interface UserVote {
    readonly vote: Vote;
    readonly trusted: boolean;
}

export default class NicknameCommand implements ApplicationCommand, AutocompleteCommand {
    name = "nickname";
    description = "Setzt Nicknames für einen User";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add")
                .setDescription("Fügt einen nickname hinzu brudi")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst"),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("nickname")
                        .setDescription("Was du tun willst"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("delete")
                .setDescription("Entfernt einen Nickname brudi")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst"),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("nickname")
                        .setDescription("Den zu entfernenden Namen")
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("deleteall")
                .setDescription("Entfernt alle nicknames brudi")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Zeigt alle nicknames brudi")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst"),
                ),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(command);
        const guild = cmd.guild;
        if (guild === null) {
            await cmd.reply("Hurensohn. Der Command ist nix für dich.");
            return;
        }

        const member = guild.members.cache.get(cmd.user.id);
        if (!member) {
            await cmd.reply("Hurensohn. Der Command ist nix für dich.");
            return;
        }

        const option = cmd.options.getSubcommand();

        const user = cmd.options.getUser("user", true);
        const isTrusted = context.roleGuard.isTrusted(member);
        const isSameUser = user.id === member.user.id;

        try {
            switch (option) {
                case "deleteall": {
                    if (!isTrusted && !isSameUser) {
                        await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                        return;
                    }

                    if (!member) {
                        await cmd.reply("Hurensohn. Der Brudi ist nicht auf dem Server.");
                        return;
                    }

                    await nickName.deleteAllNickNames(user);
                    await this.updateNickName(member, null);

                    await cmd.reply("Ok Brudi. Hab alles gelöscht");
                    return;
                }

                case "list": {
                    await this.#listNicknames(cmd, user);
                    return;
                }

                case "add": {
                    if (!isTrusted) {
                        await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                        return;
                    }

                    const nickname = cmd.options.getString("nickname", true);
                    if (await nickName.nickNameExist(user.id, nickname)) {
                        await cmd.reply(
                            `Würdest du Hurensohn aufpassen, wüsstest du, dass für ${user} '${nickname}' bereits existiert.`,
                        );
                        return;
                    }

                    return NicknameCommand.#createNickNameVote(
                        command,
                        user,
                        nickname,
                        isTrusted,
                        context,
                    );
                }

                case "delete": {
                    if (!isTrusted && !isSameUser) {
                        await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                        return;
                    }

                    // We don't violate the DRY principle, since we're referring to another subcommand object as in the "add" subcmd.
                    // Code is equal but knowledge differs.
                    const nickname = cmd.options.getString("nickname", true);
                    await nickName.deleteNickName(user, nickname);

                    const member = guild.members.cache.get(user.id);
                    if (!member) {
                        await cmd.reply("Hurensohn. Der Brudi ist nicht auf dem Server.");
                        return;
                    }

                    if (member.nickname === nickname) {
                        await this.updateNickName(member, null);
                    }

                    await cmd.reply(`Ok Brudi. Hab für ${user} ${nickname} gelöscht`);
                    return;
                }
                default: {
                    await cmd.reply("Das hätte nie passieren dürfen");
                }
            }
        } catch (e) {
            sentry.captureException(e);
            log.error(e);
            await cmd.reply("Das hätte nie passieren dürfen");
        }
    }

    async #listNicknames(interaction: CommandInteraction, user: User) {
        const nicknames = await nickName.getNicknames(user.id);
        if (nicknames.length === 0) {
            await interaction.reply("Ne Brudi für den hab ich keine Nicknames");
            return;
        }

        const nickList = nicknames.map(n => n.nickName).join(", ");
        await interaction.reply(
            `Hab für den Brudi folgende Nicknames (${nicknames.length}):\n${nickList}`,
        );
        return;
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand !== "delete") {
            return;
        }

        // No .getUser("user") available
        // https://discordjs.guide/slash-commands/autocomplete.html#accessing-other-values
        const userId = interaction.options.get("user", true).value as string; // Snowflake of the user

        const nicknames = await nickName.getNicknames(userId);

        const focusedValue = interaction.options.getFocused().toLowerCase();

        const completions = nicknames
            .filter(n => n.nickName.toLowerCase().includes(focusedValue))
            .map(n => ({
                name: n.nickName,
                value: n.nickName,
            }));

        await interaction.respond(completions);
    }

    static async #createNickNameVote(
        command: CommandInteraction<CacheType>,
        user: User,
        nickname: string,
        trusted: boolean,
        context: BotContext,
    ) {
        const reply = await command.reply({
            content: `Eh Brudis, soll ich für ${user} ${nickname} hinzufügen?`,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            customId: "nickname-vote-yes",
                            label: "Guter",
                            style: ButtonStyle.Success,
                        },
                        {
                            type: ComponentType.Button,
                            customId: "nickname-vote-no",
                            label: "Lass ma",
                            style: ButtonStyle.Danger,
                        },
                    ],
                },
            ],
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: time.minutes(5),
        });

        const votes: Record<Snowflake, UserVote> = {
            [command.user.id]: {
                vote: "YES",
                trusted,
            },
        };

        let voteResult: undefined | boolean;

        collector.on("collect", async interaction => {
            if (!interaction.member) {
                await interaction.reply({
                    content: "Ich find dich nicht auf dem Server. Du Huso",
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            votes[interaction.user.id] = {
                vote: interaction.customId === "nickname-vote-yes" ? "YES" : "NO",
                trusted: context.roleGuard.isTrusted(interaction.member),
            };

            await interaction.reply({
                content: "Hast abgestimmt",
                flags: MessageFlags.Ephemeral,
            });

            const allVotes = Object.values(votes);

            if (hasEnoughVotes(allVotes, "NO", 7)) {
                voteResult = false;
                collector.stop();
                return;
            }

            if (hasEnoughVotes(allVotes, "YES", 7)) {
                voteResult = true;
                collector.stop();
            }
        });

        collector.once("end", async () => {
            if (voteResult === undefined) {
                await command.editReply({
                    content: "Abstimmung beendet, war wohl nich so dolle",
                    components: [],
                });
                return;
            }

            if (!voteResult) {
                await command.editReply({
                    content: `Der Vorschlag \`${nickname}\` für ${user} war echt nicht so geil`,
                    components: [],
                });
                return;
            }

            try {
                await nickName.insertNickname(user.id, nickname);
            } catch {
                await command.editReply(
                    `Würdet ihr Hurensöhne aufpassen, wüsstest ihr, dass für ${user} \`${nickname}\` bereits existiert.`,
                );
                return;
            }

            await command.editReply({
                content: `Für ${user} ist jetzt \`${nickname}\` in der Rotation`,
                components: [],
            });
        });
    }

    async updateNickName(user: GuildMember, nickname: string | null) {
        await user.setNickname(nickname);
    }
}

function hasEnoughVotes(votes: UserVote[], voteType: Vote, threshold: number) {
    const mappedVotes = votes.filter(vote => vote.vote === voteType).map(getWeightOfUserVote);
    return Math.sumPrecise(mappedVotes) >= threshold;
}

function getWeightOfUserVote(vote: UserVote): number {
    return vote.trusted ? 2 : 1;
}
