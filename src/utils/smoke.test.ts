import { describe, test, beforeEach } from "node:test";

import { expect } from "expect";

import createDatabase from "@/storage/db/database-test-init.js";

import db from "@db";

describe("smoke", () => {
    test("does math still hold?", () => {
        expect(1 + 1).toBe(2);
    });
});

describe("database smoke", () => {
    beforeEach(createDatabase);

    test("does database work?", async () => {
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
});
