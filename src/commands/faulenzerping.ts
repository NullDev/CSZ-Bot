import type { Client, Message, Snowflake } from "discord.js";

import { BotContext } from "../context.js";
import { MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { isTrusted } from "../utils/userUtils.js";

export class FaulenzerPingCommand implements MessageCommand {
    name = "faulenzerping";
    description = "Pingt alle Leute, die noch nicht auf die ausgewählte Nachricht reagiert haben, aber in der angegebenen Gruppe sind.";

    async handleMessage(message: ProcessableMessage, client: Client<boolean>, context: BotContext): Promise<void> {
        if (!isTrusted(message.member)) {
            await message.reply("Du bist nicht berechtigt, diesen Command zu benutzen.");
            return;
        }

        const messageIdThatWasRepliedTo = message.reference?.messageId ?? undefined;
        if (!messageIdThatWasRepliedTo) {
            await message.reply("Brudi du hast kein Reply benutzt");
            return;
        }

        const ignoredRoles = context.commandConfig.faulenzerPing.ignoredRoleIds;

        const roles = [...message.mentions.roles.filter(role => !ignoredRoles.has(role.id)).values()];
        if (roles.length === 0) {
            await message.reply("Du hast keine nicht-ignorierten Gruppen angegeben.");
            return;
        }

        const usersInAllRoles = new Set<Snowflake>();
        for (const role of roles) {
            for (const user of role.members.keys()) {
                usersInAllRoles.add(user);
            }
        }

        const messageThatWasRepliedTo = await message.fetchReference();

        const usersNotToNotify = await this.getUsersThatReactedToMessage(messageThatWasRepliedTo);

        const usersToNotify = [...usersInAllRoles.values()].filter(user => !usersNotToNotify.has(user));

        const usersToNotifyMentions = usersToNotify.map(user => `<@${user}>`).join(" ");

        await messageThatWasRepliedTo.reply(`Hallo! Von euch kam hierauf noch keine Reaktion. ${usersToNotifyMentions}`);
    }

    async getUsersThatReactedToMessage(message: Message<true>) {
        // Ref: https://stackoverflow.com/a/64242640
        const fetchedMessage = await message.fetch(true);

        const usersThatReacted = new Set<Snowflake>();
        const reactions = fetchedMessage.reactions.cache.values();
        for (const reaction of reactions) {
            // eslint-disable-next-line no-await-in-loop
            const usersReactedWithEmoji = await reaction.users.fetch();
            for (const user of usersReactedWithEmoji.values()) {
                usersThatReacted.add(user.id);
            }
        }
        return usersThatReacted;
    }
}
