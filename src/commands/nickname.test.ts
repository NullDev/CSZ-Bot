import { describe, mock, test } from "node:test";

import { expect } from "expect";
import type { CommandInteraction } from "discord.js";

import type { BotContext } from "#/context.ts";
import { createDatabase, closeDatabase } from "#/storage/db/database-test-init.ts";
import { defer } from "#/utils/interactionUtils.ts";
import NicknameCommand from "./nickname.ts";

function makeMember(id: string) {
    return {
        user: { id },
        setNickname: mock.fn(async (_nickname: string | null) => undefined),
    };
}

function makeDeleteAllInteraction(
    invokerId: string,
    targetId: string,
    members: { user: { id: string } }[],
) {
    return {
        isChatInputCommand: () => true,
        guild: { members: { cache: new Map(members.map(m => [m.user.id, m])) } },
        user: { id: invokerId },
        options: {
            getSubcommand: () => "deleteall",
            getUser: () => ({ id: targetId }),
        },
        reply: mock.fn(async (_content: string) => undefined),
    };
}

const context = {
    roleGuard: { isTrusted: () => true },
} as unknown as BotContext;

void describe("nickname deleteall", () => {
    void test("resets the nickname of the target, not the invoker", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);

        const invoker = makeMember("1");
        const target = makeMember("2");
        const interaction = makeDeleteAllInteraction("1", "2", [invoker, target]);

        await new NicknameCommand().handleInteraction(
            interaction as unknown as CommandInteraction,
            context,
        );

        expect(target.setNickname.mock.calls.map(c => c.arguments)).toStrictEqual([[null]]);
        expect(invoker.setNickname.mock.callCount()).toBe(0);
        expect(interaction.reply.mock.calls.map(c => c.arguments)).toStrictEqual([
            ["Ok Brudi. Hab alles gelöscht"],
        ]);
    });

    void test("replies if the target is not on the server", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);

        const invoker = makeMember("1");
        const interaction = makeDeleteAllInteraction("1", "2", [invoker]);

        await new NicknameCommand().handleInteraction(
            interaction as unknown as CommandInteraction,
            context,
        );

        expect(invoker.setNickname.mock.callCount()).toBe(0);
        expect(interaction.reply.mock.calls.map(c => c.arguments)).toStrictEqual([
            ["Hurensohn. Der Brudi ist nicht auf dem Server."],
        ]);
    });
});
