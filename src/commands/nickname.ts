import {
    CommandInteraction,
    GuildMember,
    User,
    CacheType,
    MessageComponentInteraction,
    ButtonStyle,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    ComponentType,
    AutocompleteInteraction,
} from "discord.js";

import type {
    ApplicationCommand,
    CommandResult,
    UserInteraction,
} from "./command.js";
import Nicknames from "../storage/model/Nickname.js";
import { isTrusted } from "../utils/userUtils.js";
import logger from "../utils/logger.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";

type Vote = "YES" | "NO";

interface UserVote {
    readonly vote: Vote;
    readonly trusted: boolean;
}

function getWeightOfUserVote(vote: UserVote): number {
    return vote.trusted ? 2 : 1;
}

interface Suggestion {
    readonly nicknameUserID: string;
    readonly nickname: string;
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
    ): Promise<CommandResult> {
        const cmd = ensureChatInputCommand(command);

        try {
            const option = cmd.options.getSubcommand();
            const commandUser = cmd.guild?.members.cache.find(
                (m) => m.id === cmd.user.id,
            );
            // We know that the user option is in every subcmd.
            const user = cmd.options.getUser("user", true);
            const trusted = commandUser && isTrusted(commandUser);
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
                await Nicknames.deleteNickNames(user.id);
                await this.updateNickName(member, null);
                await cmd.reply("Ok Brudi. Hab alles gelöscht");
                return;
            } else if (option === "list") {
                const nicknames = await Nicknames.getNicknames(user.id);
                if (nicknames.length === 0) {
                    await cmd.reply("Ne Brudi für den hab ich keine Nicknames");
                    return;
                }
                await cmd.reply(
                    `Hab für den Brudi folgende Nicknames (${
                        nicknames.length
                    }):\n${nicknames.map((n) => n.nickName).join(", ")}`,
                );
                return;
            } else if (option === "add") {
                if (!trusted) {
                    await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                    return;
                }
                const nickname = cmd.options.getString("nickname", true);
                if (await Nicknames.nickNameExist(user.id, nickname)) {
                    await cmd.reply(
                        `Würdest du Hurensohn aufpassen, wüsstest du, dass für ${user} '${nickname}' bereits existiert.`,
                    );
                    return;
                }
                return Nickname.createNickNameVote(
                    command,
                    user,
                    nickname,
                    trusted,
                );
                //    await this.addNickname(command, user);
            } else if (option === "delete") {
                if (!trusted && !sameuser) {
                    await cmd.reply("Hurensohn. Der Command ist nix für dich.");
                    return;
                }
                // We don't violate the DRY principle, since we're referring to another subcommand object as in the "add" subcmd.
                // Code is equal but knowledge differs.
                const nickname = cmd.options.getString("nickname", true);
                await Nicknames.deleteNickName(user.id, nickname);
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
            logger.error(e);
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

        const nicknames = await Nicknames.getNicknames(userId);

        const focusedValue = interaction.options.getFocused();

        const completions = nicknames
            .filter((n) => n.nickName.includes(focusedValue))
            .map((n) => ({
                name: n.nickName,
                value: n.nickName,
            }));

        await interaction.respond(completions);
    }

    private static async createNickNameVote(
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
        ongoingSuggestions[message.id] = { nicknameUserID: user.id, nickname };

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

        const istrusted = isTrusted(member);
        if (interaction.customId === "nicknameVoteYes") {
            userVoteMap[interaction.user.id] = {
                vote: "YES",
                trusted: istrusted,
            };
        } else if (interaction.customId === "nicknameVoteNo") {
            userVoteMap[interaction.user.id] = {
                vote: "NO",
                trusted: istrusted,
            };
        }
        // evaluate the Uservotes
        const votes: UserVote[] = Object.values(userVoteMap);
        if (this.hasEnoughVotes(votes, "NO")) {
            await interaction.update({
                content: `Der Vorschlag: \`${suggestion.nickname}\` für <@${suggestion.nicknameUserID}> war echt nicht so geil`,
                components: [],
            });
            return;
        }
        if (this.hasEnoughVotes(votes, "YES")) {
            try {
                await Nicknames.insertNickname(
                    suggestion.nicknameUserID,
                    suggestion.nickname,
                );
            } catch (error) {
                await interaction.update(
                    `Würdet ihr Hurensöhne aufpassen, wüsstest ihr, dass für <@${suggestion.nicknameUserID}> \`${suggestion.nickname}\` bereits existiert.`,
                );
                return;
            }

            await interaction.update({
                content: `Für <@${suggestion.nicknameUserID}> ist jetzt \`${suggestion.nickname}\` in der Rotation`,
                components: [],
            });
            return;
        }
        await interaction.reply({
            content: "Hast abgestimmt",
            ephemeral: true,
        });
    }

    private hasEnoughVotes(votes: UserVote[], voteType: Vote) {
        return (
            votes
                .filter((vote) => vote.vote === voteType)
                .reduce(
                    (sum, uservote) => sum + getWeightOfUserVote(uservote),
                    0,
                ) >= this.threshold
        );
    }
}
