import {
    type CommandInteraction,
    type GuildMember,
    type User,
    type CacheType,
    type MessageComponentInteraction,
    ButtonStyle,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    ComponentType,
    type AutocompleteInteraction,
    type Client,
} from "discord.js";

import type { BotContext } from "../context.js";
import type {
    ApplicationCommand,
    CommandResult,
    UserInteraction,
} from "./command.js";
import log from "@log";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";
import * as nickName from "../storage/nickName.js";

type Vote = "YES" | "NO";

interface UserVote {
    readonly vote: Vote;
    readonly trusted: boolean;
}

function getWeightOfUserVote(vote: UserVote): number {
    return vote.trusted ? 2 : 1;
}

interface Suggestion {
    readonly nickNameUserId: string;
    readonly nickName: string;
}

const ongoingSuggestions: Record<string, Suggestion> = {};
const idVoteMap: Record<string, Record<string, UserVote>> = {};

const getUserVoteMap = (messageId: string): Record<string, UserVote> => {
    if (idVoteMap[messageId] === undefined) {
        idVoteMap[messageId] = {};
    }
    return idVoteMap[messageId];
};

export class Nickname implements ApplicationCommand {
    modCommand = false;
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

    async handleInteraction(
        command: CommandInteraction,
        _client: Client,
        context: BotContext,
    ): Promise<CommandResult> {
        const cmd = ensureChatInputCommand(command);

        try {
            const option = cmd.options.getSubcommand();
            const commandUser = cmd.guild?.members.cache.find(
                m => m.id === cmd.user.id,
            );
            // We know that the user option is in every subcmd.
            const user = cmd.options.getUser("user", true);
            const trusted =
                commandUser && context.roleGuard.isTrusted(commandUser);
            const sameuser = user.id === commandUser?.user.id;

            if (option === "deleteall") {
                // Yes, we could use a switch-statement here. No, that wouldn't make the code more readable as we're than
                // struggling with the nickname parameter which is mandatory only in "add" and "delete" commands.
                // Yes, we could rearrange the code parts into separate functions. Feel free to do so.
                // Yes, "else" is uneccessary as we're returning in every block. However, I find the semantics more clear.
                if (!trusted && !sameuser) {
                    await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                    return;
                }
                const member = cmd.guild?.members.cache.get(user.id);
                if (!member) {
                    await cmd.reply(
                        "Hurensohn. Der Brudi ist nicht auf dem Server.",
                    );
                    return;
                }
                await nickName.deleteAllNickNames(user);
                await this.updateNickName(member, null);
                await cmd.reply("Ok Brudi. Hab alles gelöscht");
                return;
            }

            if (option === "list") {
                const nicknames = await nickName.getNicknames(user.id);
                if (nicknames.length === 0) {
                    await cmd.reply("Ne Brudi für den hab ich keine Nicknames");
                    return;
                }
                await cmd.reply(
                    `Hab für den Brudi folgende Nicknames (${
                        nicknames.length
                    }):\n${nicknames.map(n => n.nickName).join(", ")}`,
                );
                return;
            }

            if (option === "add") {
                if (!trusted) {
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
                return Nickname.#createNickNameVote(
                    command,
                    user,
                    nickname,
                    trusted,
                );
                //    await this.addNickname(command, user);
            }

            if (option === "delete") {
                if (!trusted && !sameuser) {
                    await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                    return;
                }

                // We don't violate the DRY principle, since we're referring to another subcommand object as in the "add" subcmd.
                // Code is equal but knowledge differs.
                const nickname = cmd.options.getString("nickname", true);
                await nickName.deleteNickName(user, nickname);
                const member = cmd.guild?.members.cache.get(user.id);
                if (!member) {
                    await cmd.reply(
                        "Hurensohn. Der Brudi ist nicht auf dem Server.",
                    );
                    return;
                }

                if (member.nickname === nickname) {
                    await this.updateNickName(member, null);
                }

                await cmd.reply(
                    `Ok Brudi. Hab für ${user} ${nickname} gelöscht`,
                );
                return;
            }

            await cmd.reply("Das hätte nie passieren dürfen");
            return;
        } catch (e) {
            log.error(e);
            await cmd.reply("Das hätte nie passieren dürfen");
            return;
        }
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
    ) {
        await command.reply({
            content: `Eh Brudis, soll ich für ${user} ${nickname} hinzufügen?`,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            customId: "nicknameVoteYes",
                            label: "Guter",
                            style: ButtonStyle.Success,
                        },
                        {
                            type: ComponentType.Button,
                            customId: "nicknameVoteNo",
                            label: "Lass ma",
                            style: ButtonStyle.Danger,
                        },
                    ],
                },
            ],
        });

        const message = await command.fetchReply();
        ongoingSuggestions[message.id] = {
            nickNameUserId: user.id,
            nickName: nickname,
        };

        getUserVoteMap(message.id)[user.id] = {
            vote: "YES",
            trusted,
        };
    }

    async updateNickName(user: GuildMember, nickname: string | null) {
        await user.setNickname(nickname);
    }
}

export class NicknameButtonHandler implements UserInteraction {
    readonly ids = ["nicknameVoteYes", "nicknameVoteNo"];
    readonly name = "NicknameButtonhandler";
    readonly threshold = 7;

    async handleInteraction(
        interaction: MessageComponentInteraction,
        _client: Client,
        context: BotContext,
    ): Promise<void> {
        const suggestion = ongoingSuggestions[interaction.message.id];

        if (suggestion === undefined) {
            await interaction.update({
                content:
                    "Ich find den Namensvorschlag nicht. Irgend ein Huso muss wohl den Bot neugestartet haben. Macht am besten ne Neue auf",
                components: [],
            });
            return;
        }
        const userVoteMap = getUserVoteMap(interaction.message.id);
        const member = interaction.guild?.members.cache.get(
            interaction.user.id,
        );
        if (member === undefined) {
            await interaction.update({
                content: "Ich find dich nicht auf dem Server. Du Huso",
                components: [],
            });
            return;
        }

        const isTrusted = context.roleGuard.isTrusted(member);
        if (interaction.customId === "nicknameVoteYes") {
            userVoteMap[interaction.user.id] = {
                vote: "YES",
                trusted: isTrusted,
            };
        } else if (interaction.customId === "nicknameVoteNo") {
            userVoteMap[interaction.user.id] = {
                vote: "NO",
                trusted: isTrusted,
            };
        }

        // evaluate the user votes
        const votes: UserVote[] = Object.values(userVoteMap);
        if (this.#hasEnoughVotes(votes, "NO")) {
            await interaction.update({
                content: `Der Vorschlag: \`${suggestion.nickName}\` für <@${suggestion.nickNameUserId}> war echt nicht so geil`,
                components: [],
            });
            return;
        }
        if (this.#hasEnoughVotes(votes, "YES")) {
            try {
                await nickName.insertNickname(
                    suggestion.nickNameUserId,
                    suggestion.nickName,
                );
            } catch (error) {
                await interaction.update(
                    `Würdet ihr Hurensöhne aufpassen, wüsstest ihr, dass für <@${suggestion.nickNameUserId}> \`${suggestion.nickName}\` bereits existiert.`,
                );
                return;
            }

            await interaction.update({
                content: `Für <@${suggestion.nickNameUserId}> ist jetzt \`${suggestion.nickName}\` in der Rotation`,
                components: [],
            });
            return;
        }
        await interaction.reply({
            content: "Hast abgestimmt",
            ephemeral: true,
        });
    }

    #hasEnoughVotes(votes: UserVote[], voteType: Vote) {
        const mappedVotes = votes
            .filter(vote => vote.vote === voteType)
            .map(getWeightOfUserVote);
        return Math.sumPrecise(mappedVotes) >= this.threshold;
    }
}
