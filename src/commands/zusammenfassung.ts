import type { MessageCommand } from "#commands/command.ts";
import type { BotContext } from "#context.ts";
import type { ProcessableMessage } from "#service/command.ts";

export default class ZusammenfassungCommand implements MessageCommand {
    name = "zusammenfassung";
    description = "Macht eine Zusammenfassung der Nachrichten und so";

    async handleMessage(message: ProcessableMessage, _context: BotContext): Promise<void> {
        const messages = await message.channel.messages.fetch({
            limit: 100, // 100 is max number
            before: message.id,
        });

        const grouped = Object.groupBy(messages.values(), msg => msg.author.displayName);

        const authors = [];
        for (const [author, messages] of Object.entries(grouped)) {
            if (!messages) {
                continue;
            }

            const charCount = Math.sumPrecise(messages.map(msg => msg.content.length));
            authors.push(
                `- ${messages.length} Nachrichten (${charCount | 0} Zeichen) von ${author}`,
            );
        }

        message.channel.send(
            `Habe ${messages.size} Nachrichten abrufen können:\n${authors.join("\n")}`,
        );
    }
}
