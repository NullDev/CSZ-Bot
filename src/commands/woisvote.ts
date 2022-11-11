import {
    Client,
    CommandInteraction,
    Message,
    MessageReaction,
    SlashCommandBuilder,
    SlashCommandStringOption,
    TextBasedChannel,
    TextChannel,
    User
} from "discord.js";

import { ApplicationCommand, CommandResult } from "./command.js";
import { getConfig } from "../utils/configHandler.js";
import moment from "moment";
import WoisAction from "../storage/model/WoisAction.js";
import { ReactionHandler } from "../types.js";
import { BotContext } from "../context.js";

const config = getConfig();
const defaultWoisTime = "20:00";
// Constant will be used to check whether a message is a woisvote without querying the database
const woisVoteConstant = "⚠️🍻 **WOISVOTE** 🍻⚠️";

const createWoisMessage = async(
    reason: string,
    date: Date,
    channel: TextBasedChannel
): Promise<Message> => {
    const woisMessage = await channel.send(
        woisVoteConstant +
            "\n" +
            `Wois um ${moment(date).format(
                "HH:mm"
            )} Uhr. Grund: ${reason}. Bock?`
    );
    await woisMessage.react("👍");
    await woisMessage.react("👎");
    return woisMessage;
};

export class WoisCommand implements ApplicationCommand {
    name = "woisvote";
    description = "Erstellt einen Vote für Wois";

    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(
                new SlashCommandStringOption()
                    .setName("grund")
                    .setRequired(true)
                    .setDescription("Saufen, brauchts noch n weiteren grund?")
            )
            .addStringOption(
                new SlashCommandStringOption()
                    .setName("zeitpunkt")
                    .setRequired(false)
                    .setDescription(
                        `Wann? Uhrzeit für Ping. Standard: ${defaultWoisTime}. (Format: HH:MM)`
                    )
            );
    }

    async handleInteraction(
        command: CommandInteraction,
        _client: Client<boolean>
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
            command.options.getString("zeitpunkt", true) ?? defaultWoisTime;
        const timeMoment = moment(time, "HH:mm");

        const timeForWois = moment()
            .set("hour", timeMoment.get("hour"))
            .set("minute", timeMoment.get("minute"));

        if (timeForWois.isBefore(moment())) {
            await command.reply({
                content:
                    "Sorry, ich kann einen Woisping nur in der Zukunft ausführen. Zeitreisen müssen erst noch erfunden werden.",
                ephemeral: true
            });
            return;
        }

        const start = timeForWois.subtract(6, "hours");
        const existingWoisVote = await WoisAction.getWoisActionInRange(
            start.toDate(),
            timeForWois.toDate()
        );
        if (existingWoisVote !== null) {
            await command.reply(
                `Es gibt bereits einen Woisvote für ${moment(
                    existingWoisVote.date
                ).format("HH:mm")} Uhr. Geh doch da hin: ${
                    existingWoisVote.messageId
                }`
            );
            return;
        }

        const woisMessage = await createWoisMessage(
            reason,
            timeForWois.toDate(),
            command.channel
        );

        const result = await WoisAction.insertWoisAction(
            woisMessage.id,
            reason,
            timeForWois.toDate()
        );
        if (!result) {
            await command.channel.send(
                "Ich konnte den Woisvote nicht erstellen. Da hat wohl jemand kacke gebaut."
            );
        }
    }
}

export const woisVoteReactionHandler: ReactionHandler = async(
    reactionEvent: MessageReaction,
    user: User,
    _context: BotContext,
    removal: boolean
): Promise<void> => {
    const { message } = reactionEvent;

    if (!message.content) return;

    if (!message.content.startsWith(woisVoteConstant)) {
        return;
    }

    const voteYes = reactionEvent.emoji.name !== "👍";
    const voteNo = reactionEvent.emoji.name !== "👎";
    // Some other emoji was used
    if (!voteYes && !voteNo) {
        return;
    }
    // We just need to save/update interest when a user votes with yes or removes a yes vote.
    // No need to do anything when a user votes with no.
    // Only ambigous case is when a user reacts with both yes and no. In this case we just keep the yes vote.
    const interest = !(removal && voteYes) || voteYes;

    const woisAction = await WoisAction.getWoisActionByMessageId(message.id);
    if (woisAction === null) {
        return;
    }
    if (!woisAction.interestedUsers.includes(user.id)) {
        return;
    }

    await WoisAction.registerInterst(message.id, user.id, interest);
};

export const woisVoteScheduler = async(
    _context: BotContext
): Promise<void> => {
    const woisAction = await WoisAction.getWoisActionInRange(
        new Date(0),
        new Date()
    );
    if (woisAction === null) {
        return;
    }
    const hauptchat = config.ids.hauptchat_id;

    const channel = _context.client.channels.cache.get(hauptchat);
    if (!channel) {
        return;
    }
    if (channel.isTextBased() === false) {
        return;
    }

    const woisMessage = await (channel as TextChannel).send(
        "Yoooo, es ist Zeit für das angekündigte Wois. Denk dran, der Grund war: " +
            woisAction.reason
    );

    // We remove woisvote from the database immediately before anything goes wrong and we spam pings.
    await WoisAction.destroy({
        where: {
            id: woisAction.id
        }
    });

    if (woisAction.interestedUsers.length === 0) {
        // No one wants wois
        return;
    }

    const chunkSize = 10;
    for (let i = 0; i < woisAction.interestedUsers.length; i += chunkSize) {
        const chunk = woisAction.interestedUsers.slice(i, i + chunkSize);
        // It's okay for readability
        // eslint-disable-next-line no-await-in-loop
        await woisMessage.reply(chunk.join(" "));
    }
};
