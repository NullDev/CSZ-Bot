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

type SignalDef = {
    label: string;
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
    containsDiscordInvite: 25,
    massUserMentions: 20,
    roleMentions: 25,
    crossChannelDuplicate: 30,
    onlyDefaultRole: 10,
} as const;

/** Returns true if `instant` occurred more recently than `duration` ago. */
function isWithin(instant: Temporal.Instant, duration: Temporal.DurationLike): boolean {
    return Temporal.Instant.compare(instant, Temporal.Now.instant().subtract(duration)) > 0;
}

const signals: readonly SignalDef[] = [
    {
        label: "Neues Discord-Konto (< 7 Tage alt)",
        evaluate: (_msg, member) => {
            const created = Temporal.Instant.fromEpochMilliseconds(member.user.createdTimestamp);
            return isWithin(created, { hours: 7 * 24 }) ? SCORES.accountAgeUnder7Days : 0;
        },
    },
    {
        label: "Relativ neues Discord-Konto (7-30 Tage alt)",
        evaluate: (_msg, member) => {
            const created = Temporal.Instant.fromEpochMilliseconds(member.user.createdTimestamp);
            return !isWithin(created, { hours: 7 * 24 }) && isWithin(created, { hours: 30 * 24 })
                ? SCORES.accountAgeUnder30Days
                : 0;
        },
    },
    {
        label: "Dem Server in den letzten 10 Minuten beigetreten",
        evaluate: (_msg, member) => {
            if (member.joinedTimestamp === null) return 0;
            const joined = Temporal.Instant.fromEpochMilliseconds(member.joinedTimestamp);
            return isWithin(joined, { minutes: 10 }) ? SCORES.guildJoinUnder10Minutes : 0;
        },
    },
    {
        label: "Dem Server in der letzten Stunde beigetreten",
        evaluate: (_msg, member) => {
            if (member.joinedTimestamp === null) return 0;
            const joined = Temporal.Instant.fromEpochMilliseconds(member.joinedTimestamp);
            return !isWithin(joined, { minutes: 10 }) && isWithin(joined, { hours: 1 })
                ? SCORES.guildJoinUnder1Hour
                : 0;
        },
    },
    {
        label: "Dem Server in den letzten 48 Stunden beigetreten",
        evaluate: (_msg, member) => {
            if (member.joinedTimestamp === null) return 0;
            const joined = Temporal.Instant.fromEpochMilliseconds(member.joinedTimestamp);
            return !isWithin(joined, { hours: 1 }) && isWithin(joined, { hours: 48 })
                ? SCORES.guildJoinUnder48Hours
                : 0;
        },
    },
    {
        label: "Nachricht enthält einen Link",
        evaluate: msg => (URL_PATTERN.test(msg.content) ? SCORES.containsUrl : 0),
    },
    {
        label: "Nachricht enthält einen Discord-Einladungslink",
        evaluate: msg =>
            DISCORD_INVITE_PATTERN.test(msg.content) ? SCORES.containsDiscordInvite : 0,
    },
    {
        label: "Nachricht erwähnt mehrere Nutzer",
        evaluate: msg => (msg.mentions.users.size >= 2 ? SCORES.massUserMentions : 0),
    },
    {
        label: "Nachricht erwähnt eine oder mehrere Rollen",
        evaluate: msg => (msg.mentions.roles.size > 0 ? SCORES.roleMentions : 0),
    },
    {
        label: "Keine selbst zugewiesenen Rollen",
        evaluate: (_msg, member) =>
            // ≤ 2 means only @everyone + the default role, i.e. no self-assigned roles
            member.roles.cache.size <= 2 ? SCORES.onlyDefaultRole : 0,
    },
    {
        label: "Gleiche Nachricht in mehreren Kanälen gesendet",
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
    const { timeWindowMinutes } = context.commandConfig.autoban;
    const windowStart = Temporal.Now.instant().subtract({ minutes: timeWindowMinutes });
    const history = (recentMessages.get(member.id) ?? []).filter(
        m => Temporal.Instant.compare(m.recordedAt, windowStart) > 0,
    );

    if (history.length === 0) {
        recentMessages.delete(member.id);
    } else {
        recentMessages.set(member.id, history);
    }

    const results = signals.map(({ label, evaluate }) => ({
        label,
        points: evaluate(message, member, context, history),
    }));

    return {
        score: results.reduce((sum, r) => sum + r.points, 0),
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
