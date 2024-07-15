import type { ReactionHandler } from "./ReactionHandler.js";

import * as emoji from "../service/emoteService.js";

export default {
    displayName: "Log Emotes Reaction Handler",
    async execute(reactionEvent, invoker, context, reactionWasRemoved) {
        if (invoker.bot) {
            return;
        }

        if (reactionWasRemoved) {
            await emoji.processReactionRemove(reactionEvent, invoker, context);
        } else {
            await emoji.processReactionAdd(reactionEvent, invoker, context);
        }
    },
} satisfies ReactionHandler;
