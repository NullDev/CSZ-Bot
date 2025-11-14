import type { ReactionHandler } from "../ReactionHandler.js";

import * as emoteLoggingService from "#/service/emoteLogging.js";

export default {
    displayName: "Log Emotes Reaction Handler",
    async execute(reactionEvent, invoker, context, reactionWasRemoved) {
        if (invoker.bot) {
            return;
        }

        // Not supported
        if (reactionWasRemoved) {
            return;
        }

        await emoteLoggingService.processReactionAdd(reactionEvent, context);
    },
} satisfies ReactionHandler;
