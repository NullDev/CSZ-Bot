import { describe, test } from "node:test";

import { expect } from "expect";
import { Collection, type GuildMember, type Message, type MessageReaction } from "discord.js";

import { createDatabase, closeDatabase } from "#/storage/db/database-test-init.ts";
import { defer } from "#/utils/interactionUtils.ts";
import * as polls from "#/storage/poll.ts";
import * as legacyDelayedPoll from "#/service/delayedPollLegacy.ts";
import { countDelayedVote, POLL_EMOJIS } from "./poll.ts";

import db from "#db";

void describe("delayed poll votes", () => {
    void test("votes end up in the state that is used for the result", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);
        legacyDelayedPoll.delayedPolls.length = 0;

        const location = { guildId: "1", channelId: "2", messageId: "3" };
        const poll = await polls.createPoll(
            "100",
            location,
            location,
            "Frage?",
            false, // single choice
            false,
            false,
            Temporal.Instant.from("2030-01-01T00:00:00Z"),
            ["a", "b"],
        );

        legacyDelayedPoll.delayedPolls.push({
            pollId: "3",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            finishesAt: new Date("2030-01-01T00:00:00Z"),
            reactions: [[], []],
            reactionMap: ["a", "b"],
        });

        let sentMessageId = 1000;
        const message = {
            id: "3",
            guildId: "1",
            channelId: "2",
            guild: { id: "1" },
            reactions: { cache: new Collection() },
            channel: {
                send: async () => ({
                    id: String(sentMessageId++),
                    guild: { id: "1" },
                    channel: { id: "2" },
                }),
            },
        } as unknown as Message<true>;

        const vote = (userId: string, optionIndex: number) =>
            countDelayedVote(
                poll,
                message,
                { id: userId } as GuildMember,
                {
                    message,
                    emoji: { name: POLL_EMOJIS[optionIndex] },
                } as unknown as MessageReaction,
            );

        await vote("A", 0);
        await vote("A", 1); // single choice: moves A from option 0 to option 1
        await vote("B", 1);

        expect(legacyDelayedPoll.delayedPolls[0]?.reactions).toStrictEqual([[], ["A", "B"]]);

        const stored = await db()
            .selectFrom("additionalMessageData")
            .select("payload")
            .where("messageId", "=", "3")
            .where("usage", "=", "DELAYED_POLL")
            .executeTakeFirstOrThrow();
        expect(JSON.parse(stored.payload).reactions).toStrictEqual([[], ["A", "B"]]);
    });
});
