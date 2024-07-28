import {
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

import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import type { EhrePoints } from "@/storage/db/model.js";
import type { ReactionHandler } from "@/handler/ReactionHandler.js";

import * as ehre from "@/service/ehre.js";

function createUserPointString(e: EhrePoints) {
    return `<@${e.userId}> : ${ehre.formatPoints(e.points)}`;
}

async function createEhreTable(
    context: BotContext,
): Promise<MessagePayload | InteractionReplyOptions> {
    const ranking = await ehre.getRanking();
    return {
        embeds: [
            {
                color: 0x1ea188,
                author: {
                    name: context.client.user.username,
                },
                fields: [
                    ranking.best
                        ? {
                              name: "Ehrenpate",
                              value: ranking.best ? createUserPointString(ranking.best) : "",
                              inline: false,
                          }
                        : {
                              name: "Fangt an",
                              value: "Noch ist niemand geährt worden",
                          },
                    ...(ranking.middle.length > 0
                        ? [
                              {
                                  name: "Ehrenbrudis",
                                  value: ranking.middle
                                      .map(user => createUserPointString(user))
                                      .join("\n"),
                                  inline: false,
                              },
                          ]
                        : []),
                    ...(ranking.bottom.length > 0
                        ? [
                              {
                                  name: "Ehrenhafte User",
                                  value: ranking.bottom
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

export const ehreReactionHandler = {
    displayName: "Ehre Reaction Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ) {
        if (reactionWasRemoved) {
            // Ehres can't be removed, they stay.
            return;
        }

        const reactionName = reactionEvent.emoji.name;
        if (!reactionName || !context.commandConfig.ehre.emojiNames.has(reactionName)) {
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

        if (await ehre.hasVoted(invoker)) {
            // Same when the user already voted; just swallow it
            return;
        }

        await ehre.addEhre(invoker, ehrenbruder);

        const replyChannel = reactionEvent.message.channel;
        const replyChannelHasSlowMode =
            replyChannel.isTextBased() && (replyChannel as TextChannel).rateLimitPerUser > 0;
        const replyChannelHasOverwrite =
            replyChannel.isTextBased() &&
            (replyChannel as TextChannel).permissionOverwrites.cache
                .get(context.roles.default.id)
                ?.deny?.has("SendMessages");

        if (replyChannelHasSlowMode || replyChannelHasOverwrite) {
            return;
        }

        await reactionEvent.message.reply(`${invoker} hat ${ehrenbruder} geährt`);
    },
} satisfies ReactionHandler;

export default class EhreCommand implements ApplicationCommand {
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
            new SlashCommandSubcommandBuilder().setName("tabelle").setDescription("Alle Ehrenuser"),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
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
            const reply = await ehre.addEhre(command.user, user);
            await command.reply(reply);
        }
    }
}
