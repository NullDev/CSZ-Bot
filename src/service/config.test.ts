import { describe, test } from "node:test";

import { expect } from "expect";
import { ChannelType, type Guild, type GuildEmoji } from "discord.js";

import { configSchema } from "#/service/config.ts";

const alarm = { id: "400", name: "alarm" };
const sadHamster = { id: "401", name: "sad_hamster" };

const guild = {
    id: "1337",
    channels: {
        cache: new Map([
            ["100", { id: "100", type: ChannelType.GuildText }],
            ["200", { id: "200", type: ChannelType.GuildVoice }],
        ]),
    },
    roles: {
        cache: new Map([["300", { id: "300" }]]),
    },
    emojis: {
        resolve: (id: string) => (id === alarm.id ? alarm : null),
        cache: {
            find: (predicate: (e: GuildEmoji) => boolean) =>
                ([alarm, sadHamster] as unknown as GuildEmoji[]).find(predicate),
        },
    },
} as unknown as Guild;

const schema = configSchema(guild);

void describe("configSchema guild resolution", () => {
    void test("resolves text channels and reports all bad ids at once", () => {
        const result = schema.shape.textChannel.safeParse({
            banReasonChannelId: "100",
            bannedChannelId: "100",
            botLogChannelId: "200", // voice channel -> wrong type
            hauptchatChannelId: "100",
            votesChannelId: "999", // does not exist
            botSpamChannelId: "100",
            hauptwoisTextChannelId: "100",
            roleAssignerChannelId: "100",
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toHaveLength(2);
        expect(result.error?.issues.map(i => i.path[0])).toStrictEqual([
            "botLogChannelId",
            "votesChannelId",
        ]);
    });

    void test("resolves channel objects on success", () => {
        const result = schema.shape.voiceChannel.safeParse({
            hauptWoischatChannelId: "200",
        });

        expect(result.success).toBe(true);
        expect(result.data?.hauptWoischatChannelId).toMatchObject({ id: "200" });
    });

    void test("resolves emoji by id, falls back by name, errors otherwise", () => {
        const result = schema.shape.emoji.safeParse({
            alarmEmojiId: "400", // resolved by id
            sadHamsterEmojiId: "999", // resolved via fallback name
            trichterEmojiId: "999", // no fallback -> error
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toHaveLength(1);
        expect(result.error?.issues[0]?.path).toStrictEqual(["trichterEmojiId"]);
    });
});
