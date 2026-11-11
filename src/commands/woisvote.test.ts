import { describe, mock, test } from "node:test";

import { expect } from "expect";
import type { CommandInteraction, Message } from "discord.js";

import type { BotContext } from "#/context.ts";
import { createDatabase, closeDatabase } from "#/storage/db/database-test-init.ts";
import * as woisAction from "#/storage/woisAction.ts";
import { defer } from "#/utils/interactionUtils.ts";
import WoisCommand from "./woisvote.ts";

void describe("woisvote", () => {
    // Note: The command only accepts times in the future, so this test fails if it runs at 23:59 local time
    void test("tells the user about an existing woisvote in range", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);

        const existingTime = Temporal.Now.plainDateTimeISO().withPlainTime("20:00");
        await woisAction.insertWoisAction(
            { id: "123" } as Message,
            "Saufen",
            new Date(existingTime.toString()).toTemporalInstant(),
        );

        const reply = mock.fn(async (_content: unknown) => undefined);
        const command = {
            isChatInputCommand: () => true,
            channel: { isTextBased: () => true, guild: {} },
            options: {
                getString: (name: string) => (name === "grund" ? "Saufen" : "23:59"),
            },
            user: { id: "1" },
            reply,
        };
        const context = {
            guild: { members: { cache: new Map() } },
        } as unknown as BotContext;

        await new WoisCommand().handleInteraction(
            command as unknown as CommandInteraction,
            context,
        );

        expect(reply.mock.calls.map(c => c.arguments)).toStrictEqual([
            ["Es gibt bereits einen Woisvote für 20:00 Uhr. Geh doch da hin: 123"],
        ]);
    });
});
