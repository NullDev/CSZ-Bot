import { describe, test } from "node:test";

import { expect } from "expect";

import type { BotContext } from "#/context.ts";
import type { ProcessableMessage } from "#/service/command.ts";
import PollCommand from "./poll.ts";

void describe("poll", () => {
    void test("rejects delayed polls longer than 7 days", async () => {
        // Use a different channel than the votes channel, so the command bails out before touching Discord
        const message = { channel: {} } as unknown as ProcessableMessage;
        const context = { textChannels: { votes: {} } } as unknown as BotContext;
        const command = new PollCommand();

        const sevenDays = 7 * 24 * 60;
        expect(
            await command.legacyHandler(message, context, [
                "-d",
                String(sevenDays),
                "Frage",
                ";",
                "a",
                ";",
                "b",
            ]),
        ).toBe("Du kannst keine verzögerte Abstimmung außerhalb des Umfragenchannels machen!");
        expect(
            await command.legacyHandler(message, context, [
                "-d",
                String(sevenDays + 1),
                "Frage",
                ";",
                "a",
                ";",
                "b",
            ]),
        ).toBe("Bruder du kannst maximal 7 Tage auf ein Ergebnis warten 🙄");
    });
});
