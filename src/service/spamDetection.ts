import type { GuildMember, Message, Snowflake } from "discord.js";

import type { BotContext } from "#/context.ts";

type RecentMessage = {
    messageId: Snowflake;
    content: string;
    channelId: Snowflake;
    recordedAt: Temporal.Instant;
};

type Signal = (
    message: Message<true>,
    member: GuildMember,
    context: BotContext, // available if a future signal needs it
    history: readonly RecentMessage[],
) => number;

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

function scoreAccountAge(_msg: Message<true>, member: GuildMember): number {
    const now = Temporal.Now.instant();
    const created = Temporal.Instant.fromEpochMilliseconds(member.user.createdTimestamp);
    if (Temporal.Instant.compare(created, now.subtract({ hours: 7 * 24 })) > 0) {
        return SCORES.accountAgeUnder7Days;
    }
    if (Temporal.Instant.compare(created, now.subtract({ hours: 30 * 24 })) > 0) {
        return SCORES.accountAgeUnder30Days;
    }
    return 0;
}

function scoreGuildJoin(_msg: Message<true>, member: GuildMember): number {
    if (member.joinedTimestamp === null) return 0;
    const now = Temporal.Now.instant();
    const joined = Temporal.Instant.fromEpochMilliseconds(member.joinedTimestamp);
    if (Temporal.Instant.compare(joined, now.subtract({ minutes: 10 })) > 0) {
        return SCORES.guildJoinUnder10Minutes;
    }
    if (Temporal.Instant.compare(joined, now.subtract({ hours: 1 })) > 0) {
        return SCORES.guildJoinUnder1Hour;
    }
    if (Temporal.Instant.compare(joined, now.subtract({ hours: 48 })) > 0) {
        return SCORES.guildJoinUnder48Hours;
    }
    return 0;
}

function scoreUrl(msg: Message<true>): number {
    return URL_PATTERN.test(msg.content) ? SCORES.containsUrl : 0;
}

function scoreDiscordInvite(msg: Message<true>): number {
    return DISCORD_INVITE_PATTERN.test(msg.content) ? SCORES.containsDiscordInvite : 0;
}

function scoreMassUserMentions(msg: Message<true>): number {
    return msg.mentions.users.size >= 2 ? SCORES.massUserMentions : 0;
}

function scoreRoleMentions(msg: Message<true>): number {
    return msg.mentions.roles.size > 0 ? SCORES.roleMentions : 0;
}

function scoreOnlyDefaultRole(_msg: Message<true>, member: GuildMember): number {
    // ≤ 2 means only @everyone + the default role, i.e. no self-assigned roles
    return member.roles.cache.size <= 2 ? SCORES.onlyDefaultRole : 0;
}

function scoreCrossChannelDuplicate(
    msg: Message<true>,
    _member: GuildMember,
    _context: BotContext,
    history: readonly RecentMessage[],
): number {
    const normalized = msg.content.trim().toLowerCase();
    return history.some(m => m.content === normalized && m.channelId !== msg.channelId)
        ? SCORES.crossChannelDuplicate
        : 0;
}

const signals: readonly Signal[] = [
    scoreAccountAge,
    scoreGuildJoin,
    scoreUrl,
    scoreDiscordInvite,
    scoreMassUserMentions,
    scoreRoleMentions,
    scoreOnlyDefaultRole,
    scoreCrossChannelDuplicate,
];

export function evaluateMessage(
    message: Message<true>,
    member: GuildMember,
    context: BotContext,
): number {
    const { timeWindowMinutes } = context.commandConfig.autoban;
    const now = Temporal.Now.instant();
    const windowStart = now.subtract({ minutes: timeWindowMinutes });
    const history = (recentMessages.get(member.id) ?? []).filter(
        m => Temporal.Instant.compare(m.recordedAt, windowStart) > 0,
    );

    return signals.reduce((total, signal) => total + signal(message, member, context, history), 0);
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
