import type { ReactionHandler } from "./ReactionHandler.js";

import * as emoteLogging from "@/service/emoteLogging.js";

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

        await emoteLogging.processReactionAdd(reactionEvent, context);
    },
} satisfies ReactionHandler;
