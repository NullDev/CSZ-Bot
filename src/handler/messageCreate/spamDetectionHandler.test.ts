import { beforeEach, describe, mock, test } from "node:test";

import { expect } from "expect";
import type { GuildMember, Message } from "discord.js";

import type { BotContext } from "#/context.ts";
import * as spamDetection from "#/service/spamDetection.ts";

// ---- Test bed ---------------------------------------------------------
//
// spamDetectionHandler.ts is the Discord-facing wrapper around the pure
// spamDetection scoring engine (see spamDetection.test.ts for that). Here
// we exercise the wrapper itself - in particular that `dryRun` really does
// prevent every destructive Discord call (delete/ban) while still logging
// and tracking, and that it's the only thing gating those calls.
//
// banService.banUser is the one dependency we can't fake by just building
// a plain object (it's a static import, not something reached through our
// fake `context`), so it's replaced via node's experimental module mocking
// (see package.json's `test` script for the required
// --experimental-test-module-mocks flag). Everything else - message,
// member, context - is a plain object cast through `unknown`.

const banUserMock = mock.fn(
    async (
        _context: BotContext,
        _member: GuildMember,
        _banInvoker: unknown,
        _reason: string,
        _isSelfBan: boolean,
        _durationInHours: number | null,
    ) => undefined,
);
mock.module("#/service/ban.ts", {
    exports: { banUser: banUserMock },
});

const { default: spamDetectionHandler } = await import("./spamDetectionHandler.ts");

let nextId = 0;
function uniqueId(): string {
    nextId += 1;
    return `handler-test-id-${nextId}`;
}

type MemberOptions = {
    accountAgeDays?: number;
    joinedMinutesAgo?: number | null;
    selfAssignedRoleCount?: number;
    inVoiceChannel?: boolean;
};

/** Defaults to a profile that scores as an obvious spam-ban candidate. */
function makeMember(options: MemberOptions = {}): GuildMember {
    const {
        accountAgeDays = 1,
        joinedMinutesAgo = 1,
        selfAssignedRoleCount = 0,
        inVoiceChannel = false,
    } = options;

    const id = uniqueId();
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

type MessageOptions = {
    member: GuildMember;
    content?: string;
    channelId?: string;
    mentionedUserCount?: number;
    mentionedRoleCount?: number;
    authorBot?: boolean;
    inGuild?: boolean;
};

/** Defaults to a message that, combined with the default member, scores as an obvious ban. */
function makeMessage(options: MessageOptions) {
    const {
        member,
        content = "join my server: https://discord.gg/spam",
        channelId = "channel-general",
        mentionedUserCount = 0,
        mentionedRoleCount = 0,
        authorBot = false,
        inGuild = true,
    } = options;

    const deleteMock = mock.fn(async () => undefined);

    const message = {
        id: uniqueId(),
        content,
        channelId,
        author: { bot: authorBot },
        member,
        channel: { toString: () => `<#${channelId}>` },
        mentions: {
            users: { size: mentionedUserCount },
            roles: { size: mentionedRoleCount },
        },
        inGuild: () => inGuild,
        delete: deleteMock,
    } as unknown as Message;

    return { message, deleteMock };
}

type ContextOptions = {
    enabled?: boolean;
    dryRun?: boolean;
    deleteThreshold?: number;
    banThreshold?: number;
    banDurationHours?: number;
    isMod?: boolean;
    isTrusted?: boolean;
    isGruendervater?: boolean;
};

function makeContext(options: ContextOptions = {}) {
    const {
        enabled = true,
        dryRun = true,
        deleteThreshold = 40,
        banThreshold = 60,
        banDurationHours = 24,
        isMod = false,
        isTrusted = false,
        isGruendervater = false,
    } = options;

    const spamLogSendMock = mock.fn(async () => undefined);
    const channelsGetMock = mock.fn(() => undefined);

    const context = {
        commandConfig: {
            autoban: {
                enabled,
                dryRun,
                deleteThreshold,
                banThreshold,
                banDurationHours,
                timeWindowDuration: Temporal.Duration.from("PT5M"),
            },
        },
        roleGuard: {
            isMod: () => isMod,
            isTrusted: () => isTrusted,
            isGruendervater: () => isGruendervater,
        },
        textChannels: {
            spamLog: { send: spamLogSendMock },
        },
        guild: {
            channels: { cache: { get: channelsGetMock } },
        },
        client: {
            user: { id: "bot-user-id" },
        },
    } as unknown as BotContext;

    return { context, spamLogSendMock, channelsGetMock };
}

function embedTitle(sendMock: ReturnType<typeof mock.fn>): string {
    const payload = sendMock.mock.calls[0]?.arguments[0] as { embeds: [{ title: string }] };
    return payload.embeds[0].title;
}

beforeEach(() => {
    banUserMock.mock.resetCalls();
});

// ---- guard clauses ------------------------------------------------------

void describe("spamDetectionHandler: guard clauses", () => {
    void test("does nothing when autoban is disabled", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member });
        const { context, spamLogSendMock } = makeContext({ enabled: false, dryRun: false });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(0);
    });

    void test("ignores messages from bots", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member, authorBot: true });
        const { context, spamLogSendMock } = makeContext({ dryRun: false });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(0);
    });
});

// ---- dry run must be effective -------------------------------------------

void describe("spamDetectionHandler: dry run never touches Discord", () => {
    void test("a message that would be banned is neither deleted nor does it ban the user", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member });
        const { context, spamLogSendMock } = makeContext({ dryRun: true });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(1);
        expect(embedTitle(spamLogSendMock)).toContain("Testmodus");
        expect(embedTitle(spamLogSendMock)).toContain("Würde gebannt werden");
    });

    void test("a message that would be deleted is not actually deleted", async () => {
        const member = makeMember({
            accountAgeDays: 10,
            joinedMinutesAgo: 60 * 20,
            selfAssignedRoleCount: 3,
        });
        const { message, deleteMock } = makeMessage({
            member,
            content: "check this out https://example.com",
        });
        const { context, spamLogSendMock } = makeContext({ dryRun: true });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(1);
        expect(embedTitle(spamLogSendMock)).toContain("Nachricht würde gelöscht werden");
    });

    void test("dry run tracks the message instead of deleting it", async () => {
        const member = makeMember();
        const { message } = makeMessage({ member });
        const { context } = makeContext({ dryRun: true });

        await spamDetectionHandler(message, context);

        expect(spamDetection.getTrackedMessages(member.id)).toHaveLength(1);
    });

    void test("dry run still evaluates and logs trusted members, but takes no action", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member });
        const { context, spamLogSendMock } = makeContext({ dryRun: true, isTrusted: true });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(1);
    });
});

// ---- real (non-dry-run) mode actually acts --------------------------------

void describe("spamDetectionHandler: real mode acts on the verdict", () => {
    void test("a message that would be banned is deleted and the user is banned", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member });
        const { context, spamLogSendMock } = makeContext({ dryRun: false });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(1);
        expect(banUserMock.mock.callCount()).toBe(1);
        const banArgs = banUserMock.mock.calls[0].arguments;
        expect(banArgs[0]).toBe(context);
        expect(banArgs[1]).toBe(member);
        expect(banArgs[4]).toBe(false);
        expect(banArgs[5]).toBe(24);
        expect(embedTitle(spamLogSendMock)).not.toContain("Testmodus");
        expect(embedTitle(spamLogSendMock)).toContain("Gebannt");
    });

    void test("a message that would be deleted is deleted but the user is not banned", async () => {
        const member = makeMember({
            accountAgeDays: 10,
            joinedMinutesAgo: 60 * 20,
            selfAssignedRoleCount: 3,
        });
        const { message, deleteMock } = makeMessage({
            member,
            content: "check this out https://example.com",
        });
        const { context } = makeContext({ dryRun: false });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(1);
        expect(banUserMock.mock.callCount()).toBe(0);
    });

    void test("trusted members are fully exempt from action in real mode", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member });
        const { context, spamLogSendMock } = makeContext({ dryRun: false, isTrusted: true });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(0);
    });

    void test("mods are fully exempt from action in real mode", async () => {
        const member = makeMember();
        const { message, deleteMock } = makeMessage({ member });
        const { context, spamLogSendMock } = makeContext({ dryRun: false, isMod: true });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(0);
    });
});

// ---- inoffensive messages -------------------------------------------------

void describe("spamDetectionHandler: harmless messages", () => {
    void test("a message below every threshold is only tracked, no embed is sent", async () => {
        const member = makeMember({ accountAgeDays: 900, joinedMinutesAgo: 60 * 24 * 400 });
        const { message, deleteMock } = makeMessage({ member, content: "hallo zusammen" });
        const { context, spamLogSendMock } = makeContext({ dryRun: false });

        await spamDetectionHandler(message, context);

        expect(deleteMock.mock.callCount()).toBe(0);
        expect(banUserMock.mock.callCount()).toBe(0);
        expect(spamLogSendMock.mock.callCount()).toBe(0);
        expect(spamDetection.getTrackedMessages(member.id)).toHaveLength(1);
    });
});
