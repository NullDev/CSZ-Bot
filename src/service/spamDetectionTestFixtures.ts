import type { GuildMember, Message } from "discord.js";

import type { BotContext } from "#/context.ts";

// ---- Shared spam-detection test bed ----------------------------------
//
// Fake just enough of GuildMember/Message/BotContext for the scoring engine
// (spamDetection.test.ts) and the Discord-facing wrapper
// (spamDetectionHandler.test.ts) to run against, cast through `unknown`
// since only a handful of fields are actually read by the code under test.
// No real Discord API involved. Consumers that need extra fields (mock
// spies, dry-run/role-guard config, etc.) build on top of these via object
// spreads rather than duplicating the base shape.

let nextId = 0;
export function uniqueId(prefix = "test-id"): string {
    nextId += 1;
    return `${prefix}-${nextId}`;
}

export type MemberOptions = {
    id?: string;
    /** How many days ago the Discord account was created. */
    accountAgeDays?: number;
    /** How many minutes ago the member joined the guild, or null for "unknown". */
    joinedMinutesAgo?: number | null;
    /** Roles beyond @everyone and the default role - 0 means "no self-assigned roles". */
    selfAssignedRoleCount?: number;
    inVoiceChannel?: boolean;
};

/** Defaults to a long-standing, well-established member (no identity signals fire). */
export function makeMember(options: MemberOptions = {}): GuildMember {
    const {
        id = uniqueId(),
        accountAgeDays = 365,
        joinedMinutesAgo = 60 * 24 * 90,
        selfAssignedRoleCount = 3,
        inVoiceChannel = false,
    } = options;

    const createdAt = new Date(Date.now() - accountAgeDays * 24 * 60 * 60 * 1000);
    const joinedAt =
        joinedMinutesAgo === null ? null : new Date(Date.now() - joinedMinutesAgo * 60 * 1000);

    return {
        id,
        user: { createdAt },
        joinedAt,
        roles: { cache: { size: selfAssignedRoleCount + 2 } },
        voice: { channelId: inVoiceChannel ? "voice-channel-1" : null },
        toString: () => `<@${id}>`,
    } as unknown as GuildMember;
}

export type MessageOptions = {
    id?: string;
    content?: string;
    channelId?: string;
    mentionedUserCount?: number;
    mentionedRoleCount?: number;
};

/** Defaults to an unremarkable message with no links or mentions. */
export function makeMessage(options: MessageOptions = {}): Message<true> {
    const {
        id = uniqueId(),
        content = "hallo zusammen, wie geht's?",
        channelId = "channel-general",
        mentionedUserCount = 0,
        mentionedRoleCount = 0,
    } = options;

    return {
        id,
        content,
        channelId,
        mentions: {
            users: { size: mentionedUserCount },
            roles: { size: mentionedRoleCount },
        },
    } as unknown as Message<true>;
}

export type ContextOptions = {
    deleteThreshold?: number;
    banThreshold?: number;
    timeWindowDuration?: Temporal.DurationLike | string;
};

/** Only the `autoban` scoring config - enough for evaluateMessage/decideAction. */
export function makeContext(options: ContextOptions = {}): BotContext {
    const { deleteThreshold = 40, banThreshold = 60, timeWindowDuration = "PT5M" } = options;

    return {
        commandConfig: {
            autoban: {
                deleteThreshold,
                banThreshold,
                timeWindowDuration: Temporal.Duration.from(timeWindowDuration),
            },
        },
    } as unknown as BotContext;
}
