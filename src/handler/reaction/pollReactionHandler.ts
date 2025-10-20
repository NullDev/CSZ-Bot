import type { MessageReaction, User } from "discord.js";

import type { BotContext } from "@/context.js";
import type { ReactionHandler } from "../ReactionHandler.js";

import * as pollService from "@/service/poll.js";
import { POLL_EMOJIS, VOTE_EMOJIS } from "@/service/poll.js";

export default {
    displayName: "Poll Reaction Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        _context: BotContext,
        reactionWasRemoved: boolean,
    ) {
        if (reactionWasRemoved) {
            // TODO: If we're persisting state in DB, we have to remove some stuff here
            return;
        }

        if (invoker.bot) {
            return;
        }

        const message = await reactionEvent.message.fetch();
        if (!message.inGuild()) {
            throw new Error("Guild is null");
        }

        const reactionName = reactionEvent.emoji.name;
        if (reactionName === null) {
            throw new Error("Could not find reaction name");
        }

        if (!POLL_EMOJIS.includes(reactionName) && !VOTE_EMOJIS.includes(reactionName)) {
            return;
        }

        const poll = await pollService.findPollForEmbedMessage(message);
        if (!poll) {
            return;
        }

        const validVoteReactions = poll.multipleChoices ? POLL_EMOJIS : VOTE_EMOJIS;
        if (!validVoteReactions.includes(reactionName)) {
            return;
        }

        const invokingMember = await message.guild.members.fetch(invoker.id);

        if (poll.endsAt === null) {
            await pollService.countVote(poll, message, invokingMember, reactionEvent);
            return;
        }

        if (poll.ended) {
            return;
        }
        await pollService.countDelayedVote(poll, message, invokingMember, reactionEvent);
    },
} satisfies ReactionHandler;
