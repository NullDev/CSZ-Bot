import {
    Client,
    CommandInteraction,
    InteractionReplyOptions,
    MessagePayload,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    User,
} from "discord.js";

import type { ApplicationCommand, CommandResult } from "./command.js";
import type { BotContext } from "../context.js";
import { EhreGroups, EhrePoints, EhreVotes } from "../storage/model/Ehre.js";

function createUserPointString(e: EhrePoints) {
    return `<@${e.userId}> : ${Math.round(e.points * 100) | 0}`;
}

async function createEhreTable(
    context: BotContext,
): Promise<MessagePayload | InteractionReplyOptions> {
    const userInGroups = await EhrePoints.getUserInGroups();

    return {
        embeds: [
            {
                color: 0x1ea188,
                author: {
                    name: context.client.user?.username,
                },
                fields: [
                    userInGroups.best
                        ? {
                              name: "Ehrenpate",
                              value: userInGroups.best
                                  ? createUserPointString(userInGroups.best)
                                  : "",
                              inline: false,
                          }
                        : {
                              name: "Fangt an",
                              value: "Noch ist niemand geährt worden",
                          },
                    ...(userInGroups.middle.length > 0
                        ? [
                              {
                                  name: "Ehrenbrudis",
                                  value: userInGroups.middle
                                      .map(user => createUserPointString(user))
                                      .join("\n"),
                                  inline: false,
                              },
                          ]
                        : []),
                    ...(userInGroups.bottom.length > 0
                        ? [
                              {
                                  name: "Ehrenhafte User",
                                  value: userInGroups.bottom
                                      .map(user => createUserPointString(user))
                                      .join("\n"),
                                  inline: false,
                              },
                          ]
                        : []),
                ],
            },
        ],
        ephemeral: false,
    };
}

function getVote(userInGroups: EhreGroups, voter: string): number {
    if (userInGroups.best?.userId === voter) {
        return 5;
    } else if (userInGroups.middle.map(u => u.userId).includes(voter)) {
        return 2;
    }
    return 1;
}

async function handleVote(voter: string, user: string) {
    const userInGroups = await EhrePoints.getUserInGroups();
    await EhreVotes.insertVote(voter);
    await EhrePoints.addPoints(user, getVote(userInGroups, voter));
}

export class EhreCommand implements ApplicationCommand {
    modCommand = false;
    name = "ehre";
    description = "Fügt Ehre hinzu & Zeigt die Tabelle an";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add")
                .setDescription("Ehre einen User")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Dem ehrenhaften User"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("tabelle")
                .setDescription("Alle Ehrenuser"),
        );

    static async addEhre(
        thankingUser: User,
        ehrenbruder: User,
    ): Promise<string> {
        if (thankingUser.id === ehrenbruder.id) {
            await EhrePoints.destroy({
                where: {
                    userId: ehrenbruder,
                },
            });
            return "Willst dich selber ähren? Dreckiger Abschaum. Sowas verdient einfach keinen Respekt!";
        }

        if (await EhreVotes.hasVoted(thankingUser.id)) {
            return "Ey, Einmal pro tag. Nicht gierig werden";
        }

        await handleVote(thankingUser.id, ehrenbruder.id);
        return `${thankingUser} hat ${ehrenbruder} geährt`;
    }

    async handleInteraction(
        command: CommandInteraction,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const subcommand = command.options.getSubcommand();
        if (subcommand === "tabelle") {
            await command.reply(await createEhreTable(context));
            return;
        }

        const user = command.options.getUser("user", true);
        if (subcommand === "add") {
            const reply = await EhreCommand.addEhre(command.user, user);
            await command.reply(reply);
        }
    }
}
