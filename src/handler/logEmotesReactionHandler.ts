import type { ReactionHandler } from "./ReactionHandler.js";

import * as emoji from "../service/emoteService.js";

export default {
    displayName: "Log Emotes Reaction Handler",
    async execute(reactionEvent, _invoker, context, reactionWasRemoved) {
        if (reactionWasRemoved) {
            await emoji.processReactionRemove(reactionEvent, context);
        } else {
            await emoji.processReactionAdd(reactionEvent, context);
        }
    },
} satisfies ReactionHandler;
