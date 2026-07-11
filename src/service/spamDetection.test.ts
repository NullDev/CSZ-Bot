import { describe, test } from "node:test";

import { expect } from "expect";
import type { GuildMember, Message } from "discord.js";

import type { BotContext } from "#/context.ts";
import * as spamDetection from "./spamDetection.ts";

// ---- Test bed -------------------------------------------------------------
//
// Fake just enough of GuildMember/Message/BotContext for the scoring engine
// to run against, cast through `unknown` since only a handful of fields are
// actually read by spamDetection.ts. No Discord API involved.

let nextId = 0;
function uniqueId(): string {
    nextId += 1;
    return `test-id-${nextId}`;
}

type MemberOptions = {
    id?: string;
    /** How many days ago the Discord account was created. */
    accountAgeDays?: number;
    /** How many minutes ago the member joined the guild, or null for "unknown". */
    joinedMinutesAgo?: number | null;
    /** Roles beyond @everyone and the default role - 0 means "no self-assigned roles". */
    selfAssignedRoleCount?: number;
};

/** Defaults to a long-standing, well-established member (no identity signals fire). */
function makeMember(options: MemberOptions = {}): GuildMember {
    const {
        id = uniqueId(),
        accountAgeDays = 365,
        joinedMinutesAgo = 60 * 24 * 90,
        selfAssignedRoleCount = 3,
    } = options;

    const createdAt = new Date(Date.now() - accountAgeDays * 24 * 60 * 60 * 1000);
    const joinedAt =
        joinedMinutesAgo === null ? null : new Date(Date.now() - joinedMinutesAgo * 60 * 1000);

    return {
        id,
        user: { createdAt },
        joinedAt,
        roles: { cache: { size: selfAssignedRoleCount + 2 } },
        voice: { channelId: null },
    } as unknown as GuildMember;
}

type MessageOptions = {
    id?: string;
    content?: string;
    channelId?: string;
    mentionedUserCount?: number;
    mentionedRoleCount?: number;
};

/** Defaults to an unremarkable message with no links or mentions. */
function makeMessage(options: MessageOptions = {}): Message<true> {
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

type ContextOptions = {
    deleteThreshold?: number;
    banThreshold?: number;
    timeWindowDuration?: Temporal.DurationLike | string;
};

function makeContext(options: ContextOptions = {}): BotContext {
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

function labelsOf(result: spamDetection.EvaluationResult): string[] {
    return result.triggeredSignals.map(s => s.label);
}

// ---- evaluateMessage: identity signals ------------------------------------

void describe("evaluateMessage: account age signals", () => {
    void test("account younger than 7 days triggers the 'new account' signal", () => {
        const member = makeMember({ accountAgeDays: 6.9 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        expect(labelsOf(result)).toContain("Neues Discord-Konto (< 7 Tage alt)");
    });

    void test("account between 7 and 30 days old triggers only the 'relatively new' signal", () => {
        const member = makeMember({ accountAgeDays: 7.1 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        expect(labelsOf(result)).not.toContain("Neues Discord-Konto (< 7 Tage alt)");
        expect(labelsOf(result)).toContain("Relativ neues Discord-Konto (7-30 Tage alt)");
    });

    void test("account older than 30 days triggers no age signal", () => {
        const member = makeMember({ accountAgeDays: 30.1 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        expect(labelsOf(result)).not.toContain("Neues Discord-Konto (< 7 Tage alt)");
        expect(labelsOf(result)).not.toContain("Relativ neues Discord-Konto (7-30 Tage alt)");
    });
});

void describe("evaluateMessage: guild join signals", () => {
    void test("joined under 10 minutes ago triggers only the 10-minute signal", () => {
        const member = makeMember({ joinedMinutesAgo: 9.9 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        const labels = labelsOf(result);
        expect(labels).toContain("Dem Server in den letzten 10 Minuten beigetreten");
        expect(labels).not.toContain("Dem Server in der letzten Stunde beigetreten");
        expect(labels).not.toContain("Dem Server in den letzten 48 Stunden beigetreten");
    });

    void test("joined under 1 hour but over 10 minutes ago triggers only the 1-hour signal", () => {
        const member = makeMember({ joinedMinutesAgo: 30 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        const labels = labelsOf(result);
        expect(labels).not.toContain("Dem Server in den letzten 10 Minuten beigetreten");
        expect(labels).toContain("Dem Server in der letzten Stunde beigetreten");
        expect(labels).not.toContain("Dem Server in den letzten 48 Stunden beigetreten");
    });

    void test("joined under 48 hours but over 1 hour ago triggers only the 48-hour signal", () => {
        const member = makeMember({ joinedMinutesAgo: 60 * 20 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        const labels = labelsOf(result);
        expect(labels).not.toContain("Dem Server in der letzten Stunde beigetreten");
        expect(labels).toContain("Dem Server in den letzten 48 Stunden beigetreten");
    });

    void test("joined over 48 hours ago triggers no join signal", () => {
        const member = makeMember({ joinedMinutesAgo: 60 * 49 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        expect(labelsOf(result)).not.toContain("Dem Server in den letzten 48 Stunden beigetreten");
    });

    void test("member with unknown join time triggers no join signal", () => {
        const member = makeMember({ joinedMinutesAgo: null });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        const labels = labelsOf(result);
        expect(labels).not.toContain("Dem Server in den letzten 10 Minuten beigetreten");
        expect(labels).not.toContain("Dem Server in der letzten Stunde beigetreten");
        expect(labels).not.toContain("Dem Server in den letzten 48 Stunden beigetreten");
    });
});

void describe("evaluateMessage: role signal", () => {
    void test("member with no self-assigned roles triggers the signal", () => {
        const member = makeMember({ selfAssignedRoleCount: 0 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        expect(labelsOf(result)).toContain("Keine selbst zugewiesenen Rollen");
    });

    void test("member with at least one self-assigned role does not trigger the signal", () => {
        const member = makeMember({ selfAssignedRoleCount: 1 });
        const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

        expect(labelsOf(result)).not.toContain("Keine selbst zugewiesenen Rollen");
    });
});

void test("identity signals are capped and cannot cross the ban threshold on their own", () => {
    // Raw identity score would be 30 + 40 + 10 = 80, capped to 50.
    const member = makeMember({ accountAgeDays: 1, joinedMinutesAgo: 1, selfAssignedRoleCount: 0 });
    const result = spamDetection.evaluateMessage(makeMessage(), member, makeContext());

    expect(result.score).toBe(50);
});

// ---- evaluateMessage: content signals --------------------------------------

void describe("evaluateMessage: link and invite signals", () => {
    void test("plain link triggers only the URL signal", () => {
        const member = makeMember();
        const message = makeMessage({ content: "schaut mal https://example.com" });
        const result = spamDetection.evaluateMessage(message, member, makeContext());

        const labels = labelsOf(result);
        expect(labels).toContain("Nachricht enthält einen Link");
        expect(labels).not.toContain("Nachricht enthält einen Discord-Einladungslink");
    });

    void test("discord invite link triggers only invite signals", () => {
        const member = makeMember();
        const message = makeMessage({ content: "join us: https://discord.gg/spam" });
        const result = spamDetection.evaluateMessage(message, member, makeContext());

        const labels = labelsOf(result);
        expect(labels).not.toContain("Nachricht enthält einen Link");
        expect(labels).toContain("Nachricht enthält einen Discord-Einladungslink");
    });

    void test("discord invite link short triggers only invite signals", () => {
        const member = makeMember();
        const message = makeMessage({ content: "join us: discord.gg/spam" });
        const result = spamDetection.evaluateMessage(message, member, makeContext());

        const labels = labelsOf(result);
        expect(labels).not.toContain("Nachricht enthält einen Link");
        expect(labels).toContain("Nachricht enthält einen Discord-Einladungslink");
    });

    void test("both a plain link and a discord invite link triggers only the appropriate signals", () => {
        const member = makeMember();
        const message = makeMessage({
            content: "schaut mal https://example.com und join us: https://discord.gg/spam",
        });
        const result = spamDetection.evaluateMessage(message, member, makeContext());

        const labels = labelsOf(result);
        expect(labels).toContain("Nachricht enthält einen Link");
        expect(labels).toContain("Nachricht enthält einen Discord-Einladungslink");
    });

    void test("message without a link triggers neither signal", () => {
        const member = makeMember();
        const message = makeMessage({ content: "kein link hier" });
        const result = spamDetection.evaluateMessage(message, member, makeContext());

        const labels = labelsOf(result);
        expect(labels).not.toContain("Nachricht enthält einen Link");
        expect(labels).not.toContain("Nachricht enthält einen Discord-Einladungslink");
    });
});

void describe("evaluateMessage: mention signals", () => {
    void test("mentioning a single user does not trigger the mass-mention signal", () => {
        const message = makeMessage({ mentionedUserCount: 1 });
        const result = spamDetection.evaluateMessage(message, makeMember(), makeContext());

        expect(labelsOf(result)).not.toContain("Nachricht erwähnt mehrere Nutzer");
    });

    void test("mentioning two or more users triggers the mass-mention signal", () => {
        const message = makeMessage({ mentionedUserCount: 2 });
        const result = spamDetection.evaluateMessage(message, makeMember(), makeContext());

        expect(labelsOf(result)).toContain("Nachricht erwähnt mehrere Nutzer");
    });

    void test("mentioning any role triggers the role-mention signal", () => {
        const message = makeMessage({ mentionedRoleCount: 1 });
        const result = spamDetection.evaluateMessage(message, makeMember(), makeContext());

        expect(labelsOf(result)).toContain("Nachricht erwähnt eine oder mehrere Rollen");
    });
});

void test("identical message posted in a second channel triggers the cross-channel-duplicate signal", () => {
    const member = makeMember();
    spamDetection.trackMessage(member.id, "msg-1", "channel-a", "Kauft jetzt billige Follower!");

    const message = makeMessage({
        content: "Kauft jetzt billige Follower!",
        channelId: "channel-b",
    });
    const result = spamDetection.evaluateMessage(message, member, makeContext());

    expect(labelsOf(result)).toContain("Gleiche Nachricht in mehreren Kanälen gesendet");
});

void test("identical message posted again in the same channel does not trigger the duplicate signal", () => {
    const member = makeMember();
    spamDetection.trackMessage(member.id, "msg-1", "channel-a", "Kauft jetzt billige Follower!");

    const message = makeMessage({
        content: "Kauft jetzt billige Follower!",
        channelId: "channel-a",
    });
    const result = spamDetection.evaluateMessage(message, member, makeContext());

    expect(labelsOf(result)).not.toContain("Gleiche Nachricht in mehreren Kanälen gesendet");
});

// ---- applyPostValidations ---------------------------------------------------

void describe("applyPostValidations", () => {
    void test("does nothing when the user has fewer than 3 tracked messages", () => {
        const member = makeMember();
        spamDetection.trackMessage(member.id, "h1", "channel-a", "hallo");
        spamDetection.trackMessage(member.id, "h2", "channel-a", "https://example.com");

        const result = spamDetection.applyPostValidations(member, makeContext(), 55);

        expect(result.adjustments).toHaveLength(0);
        expect(result.score).toBe(55);
    });

    void test("reduces the score when at most half of the recent history contains links", () => {
        const member = makeMember();
        spamDetection.trackMessage(member.id, "h1", "channel-a", "hallo");
        spamDetection.trackMessage(member.id, "h2", "channel-a", "wie geht's");
        spamDetection.trackMessage(member.id, "h3", "channel-a", "https://example.com");
        spamDetection.trackMessage(member.id, "h4", "channel-a", "schönes wetter heute");

        const result = spamDetection.applyPostValidations(member, makeContext(), 55);

        expect(result.adjustments).toHaveLength(1);
        expect(result.score).toBe(25);
    });

    void test("leaves the score untouched when more than half the recent history contains links", () => {
        const member = makeMember();
        spamDetection.trackMessage(member.id, "h1", "channel-a", "https://example.com/1");
        spamDetection.trackMessage(member.id, "h2", "channel-a", "https://example.com/2");
        spamDetection.trackMessage(member.id, "h3", "channel-a", "https://example.com/3");
        spamDetection.trackMessage(member.id, "h4", "channel-a", "hallo");

        const result = spamDetection.applyPostValidations(member, makeContext(), 55);

        expect(result.adjustments).toHaveLength(0);
        expect(result.score).toBe(55);
    });

    void test("clamps the adjusted score at zero instead of going negative", () => {
        const member = makeMember();
        spamDetection.trackMessage(member.id, "h1", "channel-a", "hallo");
        spamDetection.trackMessage(member.id, "h2", "channel-a", "wie geht's");
        spamDetection.trackMessage(member.id, "h3", "channel-a", "schönes wetter heute");

        const result = spamDetection.applyPostValidations(member, makeContext(), 10);

        expect(result.score).toBe(0);
    });
});

// ---- decideAction: end-to-end scenarios ------------------------------------
//
// These mirror what spamDetectionHandler.ts actually acts on, without any
// Discord API calls - "would this message get a user banned/deleted or not".

void describe("decideAction: should NOT be flagged", () => {
    void test("established member sharing a link is left alone (no identity signal)", () => {
        const member = makeMember({ accountAgeDays: 900, joinedMinutesAgo: 60 * 24 * 400 });
        const message = makeMessage({ content: "schaut mal: https://example.com/cool-project" });

        const result = spamDetection.decideAction(message, member, makeContext());

        expect(result.verdict).toBe("none");
    });

    void test("brand-new member's plain greeting is left alone (no content signal)", () => {
        const member = makeMember({
            accountAgeDays: 1,
            joinedMinutesAgo: 2,
            selfAssignedRoleCount: 0,
        });
        const message = makeMessage({ content: "hi, bin neu hier :)" });

        const result = spamDetection.decideAction(message, member, makeContext());

        expect(result.verdict).toBe("none");
    });

    void test("identity-only signals never trigger action, even with a near-zero threshold", () => {
        const member = makeMember({
            accountAgeDays: 1,
            joinedMinutesAgo: 1,
            selfAssignedRoleCount: 0,
        });
        const message = makeMessage({
            content: "einfach ein netter Text ohne irgendwas verdächtiges",
        });
        const context = makeContext({ deleteThreshold: 1, banThreshold: 1 });

        const result = spamDetection.decideAction(message, member, context);

        expect(result.verdict).toBe("none");
    });

    void test("borderline score is rescued by post-validation once history looks normal", () => {
        const member = makeMember({ accountAgeDays: 10, joinedMinutesAgo: 60 * 20 });
        const context = makeContext({ deleteThreshold: 40, banThreshold: 60 });
        spamDetection.trackMessage(member.id, "h1", "channel-a", "hey wie geht's");
        spamDetection.trackMessage(member.id, "h2", "channel-a", "alles gut bei euch?");
        spamDetection.trackMessage(member.id, "h3", "channel-a", "cooles wetter heute");
        spamDetection.trackMessage(member.id, "h4", "channel-a", "https://example.com/one-link");

        const message = makeMessage({ content: "schaut mal https://example.com/final" });
        const result = spamDetection.decideAction(message, member, context);

        expect(result.postValidationAdjustments).toHaveLength(1);
        expect(result.verdict).toBe("none");
    });
});

void describe("decideAction: should be deleted but not banned", () => {
    void test("moderately new member posting a plain link lands in the delete band", () => {
        const member = makeMember({ accountAgeDays: 10, joinedMinutesAgo: 60 * 20 });
        const message = makeMessage({ content: "check this out https://example.com" });
        const context = makeContext({ deleteThreshold: 40, banThreshold: 60 });

        const result = spamDetection.decideAction(message, member, context);

        expect(result.verdict).toBe("delete");
        expect(result.score).toBeGreaterThanOrEqual(40);
        expect(result.score).toBeLessThan(60);
    });

    void test("same borderline case stays deleted when history still looks link-heavy", () => {
        const member = makeMember({ accountAgeDays: 10, joinedMinutesAgo: 60 * 20 });
        const context = makeContext({ deleteThreshold: 40, banThreshold: 60 });
        spamDetection.trackMessage(member.id, "h1", "channel-a", "https://example.com/1");
        spamDetection.trackMessage(member.id, "h2", "channel-a", "https://example.com/2");
        spamDetection.trackMessage(member.id, "h3", "channel-a", "hallo");

        const message = makeMessage({ content: "check this out https://example.com" });
        const result = spamDetection.decideAction(message, member, context);

        expect(result.postValidationAdjustments).toHaveLength(0);
        expect(result.verdict).toBe("delete");
    });
});

void describe("decideAction: should be banned", () => {
    void test("brand-new member posting a discord invite is banned", () => {
        const member = makeMember({
            accountAgeDays: 1,
            joinedMinutesAgo: 2,
            selfAssignedRoleCount: 0,
        });
        const message = makeMessage({ content: "join my server: https://discord.gg/spam" });

        const result = spamDetection.decideAction(message, member, makeContext());

        expect(result.verdict).toBe("ban");
        expect(labelsOf(result)).toContain("Nachricht enthält einen Discord-Einladungslink");
    });

    void test("brand-new member mass-mentioning users and roles is banned", () => {
        const member = makeMember({
            accountAgeDays: 1,
            joinedMinutesAgo: 1,
            selfAssignedRoleCount: 0,
        });
        const message = makeMessage({
            content: "@everyone check this out",
            mentionedUserCount: 5,
            mentionedRoleCount: 1,
        });

        const result = spamDetection.decideAction(message, member, makeContext());

        expect(result.verdict).toBe("ban");
    });
});

// ---- state management: trackMessage / getTrackedMessages / flushUser ------

void describe("message tracking state", () => {
    void test("getTrackedMessages returns nothing for a user with no history", () => {
        expect(spamDetection.getTrackedMessages(uniqueId())).toHaveLength(0);
    });

    void test("trackMessage normalizes content and getTrackedMessages returns it", () => {
        const userId = uniqueId();
        spamDetection.trackMessage(userId, "msg-1", "channel-a", "  Hallo WELT  ");

        const tracked = spamDetection.getTrackedMessages(userId);

        expect(tracked).toHaveLength(1);
        expect(tracked[0].content).toBe("hallo welt");
    });

    void test("flushUser clears tracked history", () => {
        const userId = uniqueId();
        spamDetection.trackMessage(userId, "msg-1", "channel-a", "hallo");

        spamDetection.flushUser(userId);

        expect(spamDetection.getTrackedMessages(userId)).toHaveLength(0);
    });
});
