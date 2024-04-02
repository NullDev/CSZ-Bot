import {
    type Client,
    type CommandInteraction,
    type Message,
    type MessageReaction,
    type Role,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type TextBasedChannel,
    type User,
    type Snowflake,
    time,
    TimestampStyles,
} from "discord.js";
import moment from "moment";

import type { ApplicationCommand, CommandResult } from "./command.js";
import * as woisAction from "../storage/woisAction.js";
import type { ReactionHandler } from "../types.js";
import type { BotContext } from "../context.js";
import log from "@log";
import { chunkArray } from "../utils/arrayUtils.js";

const defaultWoisTime = "20:00";
// Constant can be used to check whether a message is a woisvote without querying the database
// Because we would need to fetch the full message, we just query the database. Should be faster.
const woisVoteConstant = "⚠️🍻 **WOISVOTE** 🍻⚠️";

const createWoisMessage = async (
    reason: string,
    date: Date,
    channel: TextBasedChannel,
): Promise<Message> => {
    const woisMessage = await channel.send(
        `${woisVoteConstant}\nWois in ${time(
            date,
            TimestampStyles.ShortDateTime,
        )}. Grund: ${reason}. Bock?`,
    );
    await woisMessage.react("👍");
    await woisMessage.react("👎");
    return woisMessage;
};

const pingWoisgang = async (message: Message, role: Role): Promise<void> => {
    if (message.reactions.cache.get("🍻") !== undefined) return;

    // TODO: Promise.all
    await message.react("🍻");
    await message.reply({
        content: `${role} DA PASSIERT WAS!`,
        allowedMentions: {
            // Not working for obious reasons.
            // Okay, not obvious. I don't have any clue why...
            // roles: [ config.ids.woisgang_role_id ]
            parse: ["roles"],
        },
    });
};

export class WoisCommand implements ApplicationCommand {
    name = "woisvote";
    description = "Erstellt einen Vote für Wois";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("grund")
                .setRequired(true)
                .setDescription("Saufen, brauchts noch n weiteren grund?"),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("zeitpunkt")
                .setRequired(false)
                .setDescription(
                    `Wann? Uhrzeit für Ping. Standard: ${defaultWoisTime}. (Format: HH:MM)`,
                ),
        );

    async handleInteraction(
        command: CommandInteraction,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }
        if (command.channel === null) {
            return;
        }
        if (command.channel.isTextBased() === false) {
            return;
        }

        const reason = command.options.getString("grund", true);
        const time =
            command.options.getString("zeitpunkt", false) ?? defaultWoisTime;
        const timeForWois = moment(time, "HH:mm");
        const member = context.guild.members.cache.get(command.user.id);
        const isWoisgangVote = member && context.roleGuard.isWoisGang(member);

        if (timeForWois.isBefore(moment())) {
            await command.reply({
                content:
                    "Sorry, ich kann einen Woisping nur in der Zukunft ausführen. Zeitreisen müssen erst noch erfunden werden.",
                ephemeral: true,
            });
            return;
        }

        const start = moment(timeForWois).subtract(6, "hours");
        const existingWoisVote = await woisAction.getWoisActionInRange(
            start.toDate(),
            timeForWois.toDate(),
        );
        if (existingWoisVote !== undefined) {
            await command.reply(
                `Es gibt bereits einen Woisvote für ${moment(
                    existingWoisVote.date,
                ).format("HH:mm")} Uhr. Geh doch da hin: ${
                    existingWoisVote.messageId
                }`,
            );
            return;
        }

        const woisMessage = await createWoisMessage(
            reason,
            timeForWois.toDate(),
            command.channel,
        );

        if (isWoisgangVote) {
            await pingWoisgang(woisMessage, context.roles.woisgang);
        }

        const result = await woisAction.insertWoisAction(
            woisMessage,
            reason,
            timeForWois.toDate(),
            isWoisgangVote,
        );
        if (!result) {
            await command.channel.send(
                "Ich konnte den Woisvote nicht erstellen. Da hat wohl jemand kacke gebaut.",
            );
        }
        await command.reply({
            content: `Woisvote erstellt: ${woisMessage.url}`,
            ephemeral: true,
        });
    }
}

export const woisVoteReactionHandler: ReactionHandler = {
    displayName: "Wois-Vote Reaction Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ): Promise<void> {
        const { message } = reactionEvent;

        const voteYes = reactionEvent.emoji.name === "👍";
        const voteNo = reactionEvent.emoji.name === "👎";
        // Some other emoji was used
        if (!voteYes && !voteNo) {
            return;
        }
        // We just need to save/update interest when a user votes with yes or removes a yes vote.
        // No need to do anything when a user votes with no.
        // Only ambigous case is when a user reacts with both yes and no. In this case we just keep the yes vote.
        // | voteYes | voteNo | removal | interest                 |
        // | ------- | ------ | ------- | ------------------------ |
        // | 0       | 0      | 0       | X (cannot happen)        |
        // | 1       | 0      | 0       | 1                        |
        // | 0       | 1      | 0       | 0                        |
        // | 1       | 1      | 0       | X (cannot happen)        |
        // | 0       | 0      | 1       | X (cannot happen)        |
        // | 1       | 0      | 1       | 0                        |
        // | 0       | 1      | 1       | 0                        |
        // | 1       | 1      | 1       | X (cannot happen)        |
        const interest = voteYes && !voteNo && !reactionWasRemoved;

        const action = await woisAction.getWoisActionByMessage(message);
        if (action === undefined) {
            return;
        }

        // If the woisvote has not been created by a woisgang user, but we have two votes on it. PING DEM WOISGANG!
        if (
            !action.isWoisgangAction &&
            action.interestedUsers.length === 1 &&
            interest
        ) {
            const alertingMessage = await message.channel.messages.fetch(
                message.id,
            );
            await pingWoisgang(alertingMessage, context.roles.woisgang);
        }

        const success = await woisAction.registerInterest(
            message,
            invoker,
            interest,
        );

        if (!success) {
            log.error(
                `Could not register interest for user ${invoker.id} in message ${message.id}`,
            );
        }
    },
};

export const woisVoteScheduler = async (context: BotContext): Promise<void> => {
    const pendingAction = await woisAction.getPendingWoisAction(new Date());
    if (pendingAction === undefined) {
        return;
    }

    const channel = context.textChannels.hauptchat;
    if (!channel) {
        return;
    }

    const woisMessage = await channel.send(
        `Yoooo, es ist Zeit für das angekündigte Wois. Denk dran, der Grund war: ${pendingAction.reason}`,
    );

    // We remove woisvote from the database immediately before anything goes wrong and we spam pings.
    await woisAction.destroy(pendingAction.id);

    const interestedUsers = JSON.parse(
        pendingAction.interestedUsers,
    ) as Snowflake[];

    if (interestedUsers.length === 0) {
        // No one wants wois
        return;
    }

    const chunks = chunkArray(interestedUsers, 10);
    for (const users of chunks) {
        const mentions = users.map(userId => `<@${userId}>`);
        // It's okay for readability

        await woisMessage.reply({
            content: mentions.join(" "),
            allowedMentions: {
                users,
            },
        });
    }
};
