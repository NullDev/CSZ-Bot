import type { MessageReaction, User } from "discord.js";

import type { BotContext } from "#context.ts";
import type { ReactionHandler } from "../ReactionHandler.ts";

import log from "#log";

export default {
    displayName: "Role-Assigner Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ) {
        const message = await reactionEvent.message.fetch();
        if (message.guild === null) {
            throw new Error("Message guild is null");
        }

        const channel = message.channel;
        if (!channel.isTextBased()) {
            throw new Error("Channel is not text based");
        }

        if (channel.id !== context.textChannels.roleAssigner.id) {
            return;
        }

        const botUser = context.client.user;
        if (message.author.id !== botUser.id) {
            return;
        }

        if (reactionEvent.emoji.name !== "✅") {
            return;
        }

        const member = await message.guild.members.fetch(invoker.id);
        if (!member.id || member.id === botUser.id) {
            return;
        }

        // Some roles, especially "C" are prefixed with a invisible whitespace to ensure they are not mentioned
        // by accident.
        const role = message.guild.roles.cache.find(
            r => r.name.replace(/[\u200B-\u200D\uFEFF]/g, "") === message.content,
        );

        if (role === undefined) {
            throw new Error(`Could not find role for "${message.content}"`);
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
