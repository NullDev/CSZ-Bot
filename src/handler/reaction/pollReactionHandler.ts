import type { Message, MessageReaction, User } from "discord.js";

import type { BotContext } from "#/context.ts";
import type { ReactionHandler } from "../ReactionHandler.ts";

import * as pollService from "#/service/poll.ts";
import { POLL_EMOJIS, VOTE_EMOJIS } from "#/service/poll.ts";

export function isVoteMessage(message: Message<true>, context: BotContext): boolean {
    return (
        message.author.id === context.client.user.id &&
        message.embeds.length > 0 &&
        VOTE_EMOJIS.every(e => message.reactions.cache.get(e)?.me === true)
    );
}

export default {
    displayName: "Poll Reaction Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
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

        if (VOTE_EMOJIS.includes(reactionName)) {
            // .vote polls are not persisted, they only live in the message state
            if (!isVoteMessage(message, context)) {
                return;
            }

            // remove the other vote reaction from the user
            const messageReactions = message.reactions.cache;
            for (const [emojiName, reaction] of messageReactions) {
                if (VOTE_EMOJIS.includes(emojiName) && emojiName !== reactionName) {
                    await reaction.users.remove(invoker.id);
                }
            }
            return;
        }

        const dbPoll = await pollService.findPollForEmbedMessage(message);
        if (!dbPoll) {
            return;
        }

        const invokingMember = await message.guild.members.fetch(invoker.id);

        if (dbPoll.endsAt === null) {
            await pollService.countVote(dbPoll, message, invokingMember, reactionEvent);
            return;
        }

        if (dbPoll.ended) {
            return;
        }
        await pollService.countDelayedVote(dbPoll, message, invokingMember, reactionEvent);
    },
} satisfies ReactionHandler;
