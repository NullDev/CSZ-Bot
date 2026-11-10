import type { ProcessableMessage } from "#/service/command.ts";
import type { SpecialCommand } from "#/commands/command.ts";
import log from "#log";
import * as time from "#/utils/time.ts";

export default class NischdaaaCommand implements SpecialCommand {
    name = "Feedback";
    description = "Fragt nach Feedback";
    randomness = 0.005;

    matches(message: ProcessableMessage): boolean {
        return message.content.endsWith("?") && message.content.split(" ").length > 3;
    }

    async handleSpecialMessage(message: ProcessableMessage) {
        const nbsp = "\u00A0";

        const prompt = await message.channel.send({
            content: `How is Dönerjesus doing in this session? (optional)\n${nbsp}${nbsp}\`1\`: Bad${nbsp}${nbsp}\`2\`: Fine${nbsp}${nbsp}\`3\`: Good${nbsp}${nbsp}\`0\`: Dismiss`,
        });

        const numbers = ["1️⃣", "2️⃣", "3️⃣", "0️⃣"];

        try {
            for (const n of numbers) {
                await prompt.react(n);
            }
        } catch (error) {
            log.error(error, "One of the emojis failed to react");
        }

        const collector = prompt.createReactionCollector({
            max: 10,
            time: time.minutes(2),
            filter: reaction => !!reaction.emoji.name && numbers.includes(reaction.emoji.name),
        });

        collector.on("collect", async reaction => {
            log.info(`Collected reaction: ${reaction.emoji.name}: ${reaction.count}`);
            if (reaction.emoji.name === "0️⃣") {
                collector.stop();
                await prompt.delete();
            }
        });

        collector.on("end", collected => {
            log.info(
                `Collector ended with ${collected.size} reactions: ${[...collected.keys()].join(", ")}`,
            );
        });
    }
}
