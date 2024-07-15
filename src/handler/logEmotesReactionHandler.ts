import type { ReactionHandler } from "./ReactionHandler.js";

import * as emoji from "../service/emoteService.js";

export default {
    displayName: "Log Emotes Reaction Handler",
    async execute(reactionEvent, _invoker, context, reactionWasRemoved) {
        await emoji.processReaction(reactionEvent, reactionWasRemoved, context);
    },
} satisfies ReactionHandler;
