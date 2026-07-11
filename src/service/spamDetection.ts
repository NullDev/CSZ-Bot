import type { GuildMember, Message, Snowflake } from "discord.js";

import type { BotContext } from "#/context.ts";
import log from "#log";

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
export type SignalCategory = "identity" | "content";

type SignalDef = {
    label: string;
    category: SignalCategory;
    evaluate: SignalEvaluate;
};

export type TriggeredSignal = {
    label: string;
    category: SignalCategory;
};

export type EvaluationResult = {
    score: number;
    triggeredSignals: readonly TriggeredSignal[];
};

export type PostValidationAdjustment = {
    label: string;
    delta: number;
};

export type PostValidationResult = {
    score: number;
    adjustments: readonly PostValidationAdjustment[];
};

type PostValidationEvaluate = (
    member: GuildMember,
    context: BotContext, // available if a future rule needs it
    history: readonly RecentMessage[],
) => number;

type PostValidationRule = {
    label: string;
    evaluate: PostValidationEvaluate;
};

const recentMessages = new Map<Snowflake, RecentMessage[]>();

const URL_PATTERN = /https?:\/\//i;
const DISCORD_INVITE_PATTERN = /discord\.gg\//i;

function containsLink(content: string): boolean {
    return URL_PATTERN.test(content) || DISCORD_INVITE_PATTERN.test(content);
}

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
    crossChannelDuplicate: 20,
    onlyDefaultRole: 10,
} as const;

/** Ceiling for how much "identity" signals alone can contribute to the score. */
const IDENTITY_SCORE_CAP = 50;

const POST_VALIDATION = {
    minHistoryForNormalBehaviorCheck: 3,
    normalBehaviorMaxLinkRatio: 0.5,
    normalBehaviorScoreReduction: 30,
} as const;

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

export type SpamVerdict = "none" | "delete" | "ban";

export type DecisionResult = {
    verdict: SpamVerdict;
    score: number;
    triggeredSignals: readonly TriggeredSignal[];
    postValidationAdjustments: readonly PostValidationAdjustment[];
};

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

    log.debug(
        { userId: member.id, historySize: history.length },
        "spamDetection: evaluating message",
    );

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
    const cappedIdentityScore = Math.min(identityScore, IDENTITY_SCORE_CAP);

    log.debug(
        {
            userId: member.id,
            identityScore,
            cappedIdentityScore,
            contentScore,
            score: cappedIdentityScore + contentScore,
            triggered: results.filter(r => r.points > 0).map(r => `${r.label} (+${r.points})`),
        },
        "spamDetection: evaluation result",
    );

    return {
        score: cappedIdentityScore + contentScore,
        triggeredSignals: results
            .filter(r => r.points > 0)
            .map(r => ({ label: r.label, category: r.category })),
    };
}

const postValidationRules: readonly PostValidationRule[] = [
    {
        label: "Unauffälliges Verhalten (überwiegend Text ohne Links)",
        evaluate: (_member, _context, history) => {
            if (history.length < POST_VALIDATION.minHistoryForNormalBehaviorCheck) {
                return 0;
            }
            const linkCount = history.filter(m => containsLink(m.content)).length;
            const linkRatio = linkCount / history.length;
            return linkRatio <= POST_VALIDATION.normalBehaviorMaxLinkRatio
                ? -POST_VALIDATION.normalBehaviorScoreReduction
                : 0;
        },
    },
];

/**
 * Runs additional, more expensive checks to catch false positives before actually acting
 * on a message. Only call this once a message has already crossed an action threshold -
 * not on every evaluated message, since these checks are costlier than the initial signals.
 */
export function applyPostValidations(
    member: GuildMember,
    context: BotContext,
    score: number,
): PostValidationResult {
    const { timeWindowDuration } = context.commandConfig.autoban;
    const windowStart = Temporal.Now.instant().subtract(timeWindowDuration);
    const history = getTrackedMessages(member.id).filter(
        m => Temporal.Instant.compare(m.recordedAt, windowStart) > 0,
    );

    const results = postValidationRules.map(({ label, evaluate }) => ({
        label,
        delta: evaluate(member, context, history),
    }));
    const adjustments = results.filter(r => r.delta !== 0);
    const adjustedScore = Math.max(0, score + adjustments.reduce((sum, r) => sum + r.delta, 0));

    log.debug(
        { userId: member.id, score, adjustedScore, adjustments },
        "spamDetection: post-validation applied",
    );

    return { score: adjustedScore, adjustments };
}

/**
 * Decides what should happen to a message based purely on the scoring engine - no Discord
 * side effects (deleting, banning, logging). Requires both an identity and a content signal
 * before recommending any action, then compares the (possibly post-validated) score against
 * the configured thresholds.
 */
export function decideAction(
    message: Message<true>,
    member: GuildMember,
    context: BotContext,
): DecisionResult {
    const { autoban } = context.commandConfig;
    const { score: rawScore, triggeredSignals } = evaluateMessage(message, member, context);

    const hasIdentitySignal = triggeredSignals.some(s => s.category === "identity");
    const hasContentSignal = triggeredSignals.some(s => s.category === "content");
    if (!hasIdentitySignal || !hasContentSignal) {
        return {
            verdict: "none",
            score: rawScore,
            triggeredSignals,
            postValidationAdjustments: [],
        };
    }

    let score = rawScore;
    let postValidationAdjustments: readonly PostValidationAdjustment[] = [];
    if (rawScore >= autoban.deleteThreshold) {
        const postValidation = applyPostValidations(member, context, rawScore);
        score = postValidation.score;
        postValidationAdjustments = postValidation.adjustments;
    }

    if (score >= autoban.banThreshold) {
        return { verdict: "ban", score, triggeredSignals, postValidationAdjustments };
    }
    if (score >= autoban.deleteThreshold) {
        return { verdict: "delete", score, triggeredSignals, postValidationAdjustments };
    }
    return { verdict: "none", score, triggeredSignals, postValidationAdjustments };
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

    log.debug(
        { userId, messageId, channelId, trackedCount: existing.length },
        "spamDetection: tracked message",
    );
}

export function getTrackedMessages(userId: Snowflake): readonly RecentMessage[] {
    return recentMessages.get(userId) ?? [];
}

export function flushUser(userId: Snowflake): void {
    const hadHistory = recentMessages.delete(userId);
    if (hadHistory) {
        log.debug({ userId }, "spamDetection: flushed tracked history for user");
    }
}
