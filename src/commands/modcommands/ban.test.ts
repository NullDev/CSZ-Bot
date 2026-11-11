import { describe, mock, test } from "node:test";

import { expect } from "expect";
import type { CommandInteraction } from "discord.js";

import type { BotContext } from "#/context.ts";

// Requires the --experimental-test-module-mocks flag.
const banUserMock = mock.fn(
    async (
        _context: BotContext,
        _member: unknown,
        _banInvoker: unknown,
        _reason: string,
        _isSelfBan: boolean,
        _durationInHours: number | null,
    ): Promise<string | void> => undefined,
);
mock.module("#/service/ban.ts", {
    exports: { banUser: banUserMock },
});

const { default: BanCommand } = await import("./ban.ts");

function makeInteraction(hours: number | null, minutes: number | null) {
    const target = { id: "2" };
    return {
        isChatInputCommand: () => true,
        user: { id: "1" },
        guild: { members: { resolve: () => target } },
        options: {
            getUser: () => target,
            getString: () => "Grund",
            getInteger: (name: string) => (name === "hours" ? hours : minutes),
        },
        reply: mock.fn(async (_options: unknown) => undefined),
    };
}

const context = {} as BotContext;

void describe("ban slash command", () => {
    void test("bans indefinitely when no duration is given", async () => {
        banUserMock.mock.resetCalls();

        await new BanCommand().handleInteraction(
            makeInteraction(null, null) as unknown as CommandInteraction,
            context,
        );

        expect(banUserMock.mock.callCount()).toBe(1);
        expect(banUserMock.mock.calls[0]?.arguments[5]).toBeNull();
    });

    void test("passes the given duration in hours", async () => {
        banUserMock.mock.resetCalls();

        await new BanCommand().handleInteraction(
            makeInteraction(2, 30) as unknown as CommandInteraction,
            context,
        );

        expect(banUserMock.mock.callCount()).toBe(1);
        expect(banUserMock.mock.calls[0]?.arguments[5]).toBe(2.5);
    });
});
