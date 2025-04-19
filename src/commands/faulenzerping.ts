import {
    ActionRowBuilder,
    ApplicationCommandType,
    type CacheType,
    type CommandInteraction,
    ComponentType,
    ContextMenuCommandBuilder,
    type ContextMenuCommandType,
    type Message,
    type Role,
    RoleSelectMenuBuilder,
    type RoleSelectMenuInteraction,
    type Snowflake,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import { chunkArray } from "@/utils/arrayUtils.js";
import * as time from "@/utils/time.js";

export default class FaulenzerPingCommand implements ApplicationCommand {
    name = "Faulenzerping"; // Must be upper case, because this name will be matched against the application command name
    description =
        "Pingt alle Leute, die noch nicht auf die ausgewählte Nachricht reagiert haben, aber in der angegebenen Gruppe sind.";
    applicationCommand = new ContextMenuCommandBuilder()
        .setName("Faulenzerping")
        .setType(ApplicationCommandType.Message as ContextMenuCommandType);

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isMessageContextMenuCommand()) {
            return;
        }

        if (!command.member || !context.roleGuard.isTrusted(command.member)) {
            await command.reply({
                content: "Du bist nicht berechtigt, diesen Command zu benutzen.",
                ephemeral: true,
            });
            return;
        }

        const response = await command.reply({
            content: "Welche Rolle ist die mit den Faulenzern?",
            components: [
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("role-to-ping")
                        .setPlaceholder("Rolle mit Faulenzern"),
                ),
            ],
            ephemeral: true,
        });

        let confirmation: RoleSelectMenuInteraction<CacheType>;
        try {
            confirmation = await response.awaitMessageComponent({
                filter: i => i.user.id === command.user.id,
                componentType: ComponentType.RoleSelect,
                time: time.minutes(1),
            });
        } catch (e) {
            await response.edit({
                content: "Keine Reaktion bekommen, breche ab lol.",
                components: [],
            });
            return;
        }

        if (confirmation.roles.size === 0) {
            await response.edit({
                content: "Keine Rollen ausgewählt :(",
                components: [],
            });
            return;
        }

        const { allowedRoleIds, maxNumberOfPings, minRequiredReactions } =
            context.commandConfig.faulenzerPing;
        const roleIds = [...confirmation.roles.keys()].filter(roleId => allowedRoleIds.has(roleId));
        if (roleIds.length === 0) {
            await response.edit({
                content: "Du hast keine erlaubten Rollen angegeben.",
                components: [],
            });
            return;
        }

        const validRoles = (
            await Promise.all(roleIds.map(r => context.guild.roles.fetch(r)))
        ).filter(role => !!role) as Role[];

        await response.edit({
            content: `Alles klar, nerve Faulenzer aus diesen Gruppen: ${validRoles
                .map(v => v.toString())
                .join(", ")}`,
            components: [],
        });

        const usersInAllRoles = new Set<Snowflake>();
        for (const role of validRoles) {
            for (const user of role.members.keys()) {
                usersInAllRoles.add(user);
            }
        }

        const usersNotToNotify = await this.getUsersThatReactedToMessage(command.targetMessage);
        if (usersNotToNotify.size < minRequiredReactions) {
            await response.edit({
                content: `Es gibt nur ${usersNotToNotify.size} Reaktionen, das ist zu wenig.`,
                components: [],
            });
            return;
        }

        const usersToNotify = [...usersInAllRoles.values()].filter(
            user => !usersNotToNotify.has(user),
        );

        if (usersToNotify.length > maxNumberOfPings) {
            await response.edit({
                content: `Offenbar interessieren sich so wenig dafür, dass das Limit von ${maxNumberOfPings} Pings überschritten wurde.\nEs würden ${usersToNotify.length} Leute genervt.`,
                components: [],
            });
            return;
        }

        await this.notifyUsers(
            command.targetMessage,
            "Hallo! Von euch kam hierauf noch keine Reaktion.",
            usersToNotify,
        );
    }

    async getUsersThatReactedToMessage(message: Message) {
        // Ref: https://stackoverflow.com/a/64242640
        const fetchedMessage = await message.fetch(true);

        const usersThatReacted = new Set<Snowflake>();
        const reactions = fetchedMessage.reactions.cache.values();
        for (const reaction of reactions) {
            const usersReactedWithEmoji = await reaction.users.fetch();
            for (const user of usersReactedWithEmoji.values()) {
                usersThatReacted.add(user.id);
            }
        }
        return usersThatReacted;
    }

    async notifyUsers(
        originalMessage: Message,
        message: string,
        usersToNotify: readonly Snowflake[],
    ) {
        const userChunks = chunkArray(usersToNotify, 10);
        for (const users of userChunks) {
            const usersToNotifyMentions = users.map(userId => `<@${userId}>`).join(" ");

            await originalMessage.reply({
                content: `${message} ${usersToNotifyMentions}`,
                allowedMentions: { users },
            });
        }
    }
}
