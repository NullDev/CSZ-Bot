import type { ReactionHandler } from "./ReactionHandler.js";

import * as emoteLogging from "../service/emoteLogging.js";

export default {
    displayName: "Log Emotes Reaction Handler",
    async execute(reactionEvent, invoker, context, reactionWasRemoved) {
        if (invoker.bot) {
            return;
        }

        if (reactionWasRemoved) {
            await emoteLogging.processReactionRemove(reactionEvent, invoker, context);
        } else {
            await emoteLogging.processReactionAdd(reactionEvent, invoker, context);
        }
    },
} satisfies ReactionHandler;
