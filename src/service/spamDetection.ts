import type { GuildMember, Message, Snowflake } from "discord.js";

import type { BotContext } from "#/context.ts";

type RecentMessage = {
    messageId: Snowflake;
    content: string;
    channelId: Snowflake;
    recordedAt: Temporal.Instant;
};

type SignalEvaluate = (
    message: Message<true>,
    member: GuildMember,
    context: BotContext, // available if a future signal needs it
    history: readonly RecentMessage[],
) => number;

/**
 * "identity" signals are derived purely from account/member profile data (age, join time, roles)
 * and are capped below the ban threshold on their own - see IDENTITY_SCORE_CAP. "content" signals
 * are derived from the message itself and are what actually pushes a score over the ban threshold.
 */
type SignalCategory = "identity" | "content";

type SignalDef = {
    label: string;
    category: SignalCategory;
    evaluate: SignalEvaluate;
};

export type EvaluationResult = {
    score: number;
    triggeredLabels: readonly string[];
};

const recentMessages = new Map<Snowflake, RecentMessage[]>();

const URL_PATTERN = /https?:\/\//i;
const DISCORD_INVITE_PATTERN = /discord\.gg\//i;

const SCORES = {
    accountAgeUnder7Days: 30,
    accountAgeUnder30Days: 15,
    guildJoinUnder10Minutes: 40,
    guildJoinUnder1Hour: 25,
    guildJoinUnder48Hours: 20,
    containsUrl: 20,
    containsDiscordInvite: 45,
    massUserMentions: 20,
    roleMentions: 25,
    crossChannelDuplicate: 30,
    onlyDefaultRole: 10,
} as const;

/**
 * Ceiling for the combined score of "identity" signals alone, kept below the default banThreshold
 * so a fresh account joining and saying hello can't be auto-banned on profile data alone -
 * at least one "content" signal (spammy message content/behavior) must also be triggered.
 */
const IDENTITY_SCORE_CAP = 50;

/** Returns true if `instant` occurred more recently than `duration` ago. */
function isWithin(instant: Temporal.Instant, duration: Temporal.DurationLike): boolean {
    return Temporal.Instant.compare(instant, Temporal.Now.instant().subtract(duration)) > 0;
}

const signals: readonly SignalDef[] = [
    {
        label: "Neues Discord-Konto (< 7 Tage alt)",
        category: "identity",
        evaluate: (_msg, member) => {
            const created = member.user.createdAt.toTemporalInstant();
            return isWithin(created, { hours: 7 * 24 }) ? SCORES.accountAgeUnder7Days : 0;
        },
    },
    {
        label: "Relativ neues Discord-Konto (7-30 Tage alt)",
        category: "identity",
        evaluate: (_msg, member) => {
            const created = member.user.createdAt.toTemporalInstant();
            return !isWithin(created, { hours: 7 * 24 }) && isWithin(created, { hours: 30 * 24 })
                ? SCORES.accountAgeUnder30Days
                : 0;
        },
    },
    {
        label: "Dem Server in den letzten 10 Minuten beigetreten",
        category: "identity",
        evaluate: (_msg, member) => {
            const joined = member.joinedAt?.toTemporalInstant();
            if (joined === undefined) return 0;
            return isWithin(joined, { minutes: 10 }) ? SCORES.guildJoinUnder10Minutes : 0;
        },
    },
    {
        label: "Dem Server in der letzten Stunde beigetreten",
        category: "identity",
        evaluate: (_msg, member) => {
            const joined = member.joinedAt?.toTemporalInstant();
            if (joined === undefined) return 0;
            return !isWithin(joined, { minutes: 10 }) && isWithin(joined, { hours: 1 })
                ? SCORES.guildJoinUnder1Hour
                : 0;
        },
    },
    {
        label: "Dem Server in den letzten 48 Stunden beigetreten",
        category: "identity",
        evaluate: (_msg, member) => {
            const joined = member.joinedAt?.toTemporalInstant();
            if (joined === undefined) return 0;
            return !isWithin(joined, { hours: 1 }) && isWithin(joined, { hours: 48 })
                ? SCORES.guildJoinUnder48Hours
                : 0;
        },
    },
    {
        label: "Nachricht enthält einen Link",
        category: "content",
        evaluate: msg => (URL_PATTERN.test(msg.content) ? SCORES.containsUrl : 0),
    },
    {
        label: "Nachricht enthält einen Discord-Einladungslink",
        category: "content",
        evaluate: msg =>
            DISCORD_INVITE_PATTERN.test(msg.content) ? SCORES.containsDiscordInvite : 0,
    },
    {
        label: "Nachricht erwähnt mehrere Nutzer",
        category: "content",
        evaluate: msg => (msg.mentions.users.size >= 2 ? SCORES.massUserMentions : 0),
    },
    {
        label: "Nachricht erwähnt eine oder mehrere Rollen",
        category: "content",
        evaluate: msg => (msg.mentions.roles.size > 0 ? SCORES.roleMentions : 0),
    },
    {
        label: "Keine selbst zugewiesenen Rollen",
        category: "identity",
        evaluate: (_msg, member) =>
            // ≤ 2 means only @everyone + the default role, i.e. no self-assigned roles
            member.roles.cache.size <= 2 ? SCORES.onlyDefaultRole : 0,
    },
    {
        label: "Gleiche Nachricht in mehreren Kanälen gesendet",
        category: "content",
        evaluate: (msg, _member, _context, history) => {
            const normalized = msg.content.trim().toLowerCase();
            return history.some(m => m.content === normalized && m.channelId !== msg.channelId)
                ? SCORES.crossChannelDuplicate
                : 0;
        },
    },
];

export function evaluateMessage(
    message: Message<true>,
    member: GuildMember,
    context: BotContext,
): EvaluationResult {
    const { timeWindowDuration } = context.commandConfig.autoban;
    const windowStart = Temporal.Now.instant().subtract(timeWindowDuration);
    const history = (recentMessages.get(member.id) ?? []).filter(
        m => Temporal.Instant.compare(m.recordedAt, windowStart) > 0,
    );

    if (history.length === 0) {
        recentMessages.delete(member.id);
    } else {
        recentMessages.set(member.id, history);
    }

    const results = signals.map(({ label, category, evaluate }) => ({
        label,
        category,
        points: evaluate(message, member, context, history),
    }));

    const identityScore = results
        .filter(r => r.category === "identity")
        .reduce((sum, r) => sum + r.points, 0);
    const contentScore = results
        .filter(r => r.category === "content")
        .reduce((sum, r) => sum + r.points, 0);

    return {
        score: Math.min(identityScore, IDENTITY_SCORE_CAP) + contentScore,
        triggeredLabels: results.filter(r => r.points > 0).map(r => r.label),
    };
}

export function trackMessage(
    userId: Snowflake,
    messageId: Snowflake,
    channelId: Snowflake,
    content: string,
): void {
    const existing = recentMessages.get(userId) ?? [];
    existing.push({
        messageId,
        content: content.trim().toLowerCase(),
        channelId,
        recordedAt: Temporal.Now.instant(),
    });
    recentMessages.set(userId, existing);
}

export function getTrackedMessages(userId: Snowflake): readonly RecentMessage[] {
    return recentMessages.get(userId) ?? [];
}

export function flushUser(userId: Snowflake): void {
    recentMessages.delete(userId);
}
