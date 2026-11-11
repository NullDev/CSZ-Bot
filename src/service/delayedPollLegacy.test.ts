import { describe, mock, test } from "node:test";

import { expect } from "expect";
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";

import type { BotContext } from "#/context.ts";
import { createDatabase, closeDatabase } from "#/storage/db/database-test-init.ts";
import { defer } from "#/utils/interactionUtils.ts";
import { delayedPolls, importPolls, processPolls } from "./delayedPollLegacy.ts";

import db from "#db";

void describe("delayed poll import", () => {
    void test("imported polls are finished when due", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);

        const createdAt = new Date("2026-01-01T00:00:00.000Z");
        const finishesAt = new Date("2026-01-02T00:00:00.000Z");
        await db()
            .insertInto("additionalMessageData")
            .values({
                guildId: "1",
                channelId: "2",
                messageId: "3",
                usage: "DELAYED_POLL",
                payload: JSON.stringify({
                    pollId: "3",
                    createdAt,
                    finishesAt,
                    reactions: [[], []],
                    reactionMap: ["a", "b"],
                }),
            })
            .execute();

        await importPolls();

        expect(delayedPolls).toHaveLength(1);
        expect(delayedPolls[0]?.createdAt).toStrictEqual(createdAt);
        expect(delayedPolls[0]?.finishesAt).toStrictEqual(finishesAt);

        const fetch = mock.fn(async (_messageId: string) => ({ embeds: [] }));
        const context = {
            textChannels: { votes: { messages: { fetch } } },
        } as unknown as BotContext;

        await processPolls(context);

        expect(fetch.mock.calls.map(c => c.arguments)).toStrictEqual([["3"]]);
    });

    void test("a deleted poll message does not block other polls and is dropped", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);
        delayedPolls.length = 0;

        const finishesAt = new Date("2026-01-02T00:00:00.000Z");
        for (const pollId of ["10", "11"]) {
            const poll = {
                pollId,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                finishesAt,
                reactions: [[], []],
                reactionMap: ["a", "b"],
            };
            await db()
                .insertInto("additionalMessageData")
                .values({
                    guildId: "1",
                    channelId: "2",
                    messageId: pollId,
                    usage: "DELAYED_POLL",
                    payload: JSON.stringify(poll),
                })
                .execute();
            delayedPolls.push(poll);
        }

        const fetch = mock.fn(async (messageId: string) => {
            if (messageId === "10") {
                throw new DiscordAPIError(
                    { code: RESTJSONErrorCodes.UnknownMessage, message: "Unknown Message" },
                    RESTJSONErrorCodes.UnknownMessage,
                    404,
                    "GET",
                    `/channels/2/messages/${messageId}`,
                    {},
                );
            }
            return { embeds: [] };
        });
        const context = {
            textChannels: { votes: { messages: { fetch } } },
        } as unknown as BotContext;

        await processPolls(context);

        expect(fetch.mock.calls.map(c => c.arguments)).toStrictEqual([["10"], ["11"]]);
        expect(delayedPolls.map(p => p.pollId)).toStrictEqual(["11"]);

        const remaining = await db()
            .selectFrom("additionalMessageData")
            .select("messageId")
            .where("usage", "=", "DELAYED_POLL")
            .execute();
        expect(remaining.map(r => r.messageId)).toStrictEqual(["11"]);
    });
});
