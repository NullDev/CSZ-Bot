import type { MessageReaction, User } from "discord.js";

import type { BotContext } from "@/context.js";
import type { ReactionHandler } from "./ReactionHandler.js";

import log from "@log";

export default {
    displayName: "Role-Assigner Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ) {
        const channel = reactionEvent.message.channel;
        if (!channel.isTextBased()) {
            throw new Error("Channel is not text based");
        }

        const message = await reactionEvent.message.fetch();
        const { guild } = message;
        if (guild === null) {
            throw new Error("Guild is null");
        }

        const botUser = context.client.user;
        if (message.author.id !== botUser.id) {
            return;
        }

        const member = await guild.members.fetch(invoker.id);
        if (reactionEvent.emoji.name !== "✅") {
            return;
        }

        if (!member.id || member.id === botUser.id) {
            return;
        }

        // Some roles, especially "C" are prefixed with a invisible whitespace to ensure they are not mentioned
        // by accident.
        const role = guild.roles.cache.find(
            r => r.name.replace(/[\u200B-\u200D\uFEFF]/g, "") === message.content,
        );

        if (role === undefined) {
            throw new Error(`Could not find role ${role}`);
        }

        if (reactionWasRemoved) {
            await member.roles.remove(role.id).catch(log.error);
            return;
        }

        // Users with role deny ID shall not assign themselves roles. Don't care about removing them.
        if (context.roleGuard.hasRoleDenyRole(member)) {
            const reaction = message.reactions.cache.get("✅");
            if (reaction === undefined) {
                return;
            }

            await reaction.users.remove(member.id);
            return;
        }

        await member.roles.add(role.id).catch(log.error);
    },
} satisfies ReactionHandler;
