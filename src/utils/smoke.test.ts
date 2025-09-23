import { describe, test } from "node:test";

import { expect } from "expect";

import { createDatabase, closeDatabase } from "@/storage/db/database-test-init.js";
import { defer } from "@/utils/interactionUtils.js";

import db from "@db";

describe("smoke", () => {
    test("does math still hold?", () => {
        expect(1 + 1).toBe(2);
    });
});

describe("database smoke", () => {
    test("does database work?", async () => {
        // TODO: Check if there is a builtin way of handling DB lifecycle
        await createDatabase();
        await using _ = defer(closeDatabase);

        const res = await db()
            .insertInto("birthdays")
            .values({
                day: 1,
                month: 2,
                userId: "12345",
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        expect(res).toMatchObject({
            day: 1,
            month: 2,
            userId: "12345",
        });

        const res2 = await db().selectFrom("birthdays").selectAll().executeTakeFirstOrThrow();
        expect(res).toStrictEqual(res2);
    });

    test("booleans supported?", async () => {
        // TODO: Check if there is a builtin way of handling DB lifecycle
        await createDatabase();
        await using _ = defer(closeDatabase);

        await db()
            .insertInto("emoteUse")
            .values({
                channelId: "13",
                emoteId: 37,
                messageGuildId: "42",
                isReaction: false,
            })
            .execute();
    });
});
