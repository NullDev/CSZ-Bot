import {
    type Client,
    type CommandInteraction,
    type InteractionReplyOptions,
    type MessagePayload,
    type MessageReaction,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    type TextChannel,
    type User,
} from "discord.js";

import type { ApplicationCommand, CommandResult } from "./command.js";
import type { BotContext } from "../context.js";
import {
    type EhreGroups,
    EhrePoints,
    EhreVotes,
} from "../storage/model/Ehre.js";

const ehreFormatter = new Intl.NumberFormat("de-DE", {
    style: "decimal",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function createUserPointString(e: EhrePoints) {
    return `<@${e.userId}> : ${ehreFormatter.format(e.points * 10)}`;
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
    }

    if (userInGroups.middle.map(u => u.userId).includes(voter)) {
        return 2;
    }

    return 1;
}

async function handleVote(voter: string, user: string) {
    const userInGroups = await EhrePoints.getUserInGroups();
    await EhreVotes.insertVote(voter);
    await EhrePoints.addPoints(user, getVote(userInGroups, voter));
}

export const ehreReactionHandler = {
    displayName: "Ehre Reaction Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ): Promise<void> {
        if (reactionWasRemoved) {
            // Ehres can't be removed, they stay.
            return;
        }

        const reactionName = reactionEvent.emoji.name;
        if (
            !reactionName ||
            !context.commandConfig.ehre.emojiNames.has(reactionName)
        ) {
            return; // Not an Ehre reaction
        }

        const ehrenmember = reactionEvent.message.member;
        if (!ehrenmember) {
            return;
        }

        const ehrenbruder = ehrenmember.user;
        if (ehrenbruder.id === invoker.id) {
            // When handling reactions, we don't remove all their points
            return;
        }

        if (await EhreVotes.hasVoted(invoker.id)) {
            // Same when the user already voted; just swallow it
            return;
        }

        await handleVote(invoker.id, ehrenbruder.id);

        const replyChannel = reactionEvent.message.channel;
        const replyChannelHasSlowMode =
            replyChannel.isTextBased() &&
            (replyChannel as TextChannel).rateLimitPerUser > 0;
        const replyChannelHasOverwrite =
            replyChannel.isTextBased() &&
            (replyChannel as TextChannel).permissionOverwrites.cache
                .get(context.roles.default.id)
                ?.deny?.has("SendMessages");

        if (replyChannelHasSlowMode || replyChannelHasOverwrite) {
            return;
        }

        await reactionEvent.message.reply(
            `${invoker} hat ${ehrenbruder} geährt`,
        );
    },
};

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
