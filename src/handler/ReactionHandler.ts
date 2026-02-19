import type { MessageReaction, User } from "discord.js";
import type { BotContext } from "#/context.ts";

export interface ReactionHandler {
    displayName: string;
    execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ): Promise<void>;
}
