import type { Client, Message, Snowflake } from "discord.js";

import { BotContext } from "../context.js";
import { MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { isTrusted } from "../utils/userUtils.js";
import { chunkArray } from "../utils/arrayUtils.js";

export class FaulenzerPingCommand implements MessageCommand {
    name = "faulenzerping";
    description = "Pingt alle Leute, die noch nicht auf die ausgewählte Nachricht reagiert haben, aber in der angegebenen Gruppe sind.";

    async handleMessage(message: ProcessableMessage, _client: Client<boolean>, context: BotContext): Promise<void> {
        if (!isTrusted(message.member)) {
            await message.reply("Du bist nicht berechtigt, diesen Command zu benutzen.");
            return;
        }

        if (message.reference?.messageId === undefined) {
            await message.reply("Brudi du hast kein Reply benutzt");
            return;
        }
        const messageThatWasRepliedTo = await message.fetchReference();

        const { ignoredRoleIds, maxNumberOfPings, minRequiredReactions } = context.commandConfig.faulenzerPing;

        const roles = [...message.mentions.roles.filter(role => !ignoredRoleIds.has(role.id)).values()];
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

        const usersNotToNotify = await this.getUsersThatReactedToMessage(messageThatWasRepliedTo);
        if (usersNotToNotify.size < minRequiredReactions) {
            await message.reply(`Es gibt nur ${usersNotToNotify.size} Reaktionen, das ist zu wenig.`);
            return;
        }

        const usersToNotify = [...usersInAllRoles.values()].filter(user => !usersNotToNotify.has(user));

        if (usersToNotify.length > maxNumberOfPings) {
            await message.reply(`Offenbar interessieren sich so wenig dafür, dass das Limit von ${maxNumberOfPings} Pings überschritten wurde.\nEs würden ${usersToNotify.length} Leute gepingt.`);
            return;
        }

        const userChunks = chunkArray(usersToNotify, 10);
        for (const users of userChunks) {
            const usersToNotifyMentions = users.map(userId => `<@${userId}>`).join(" ");

            // eslint-disable-next-line no-await-in-loop
            await messageThatWasRepliedTo.reply({
                content: `Hallo! Von euch kam hierauf noch keine Reaktion. ${usersToNotifyMentions}`,
                allowedMentions: {
                    users
                }
            });
        }
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
