import { ActionRowBuilder, ApplicationCommandType, Client, CommandInteraction, ComponentType, ContextMenuCommandBuilder, Message, Role, RoleSelectMenuBuilder, Snowflake } from "discord.js";

import { BotContext } from "../context.js";
import { ApplicationCommand } from "./command.js";
import { isTrusted } from "../utils/userUtils.js";
import { chunkArray } from "../utils/arrayUtils.js";


export class FaulenzerPingCommand implements ApplicationCommand {
    name = "faulenzerping";
    description = "Pingt alle Leute, die noch nicht auf die ausgewählte Nachricht reagiert haben, aber in der angegebenen Gruppe sind.";
    applicationCommand = new ContextMenuCommandBuilder()
        .setName("Faulenzerping")
        .setType(ApplicationCommandType.Message);

    async handleInteraction(command: CommandInteraction, client: Client, context: BotContext) {
        if (!command.isMessageContextMenuCommand()) {
            return;
        }

        if (!command.member || !isTrusted(command.member)) {
            await command.reply({ content: "Du bist nicht berechtigt, diesen Command zu benutzen.", ephemeral: true });
            return;
        }
        const messageWithReactions = command.targetMessage;

        const response = await command.reply({
            content: "Welche Rolle ist die mit den Faulenzern?",
            components: [
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("role-to-ping")
                        .setPlaceholder("Rolle mit Faulenzern")
                )
            ]
        });

        let confirmation;
        try {
            confirmation = await response.awaitMessageComponent({
                filter: i => i.user.id === command.user.id,
                componentType: ComponentType.RoleSelect,
                time: 1000 * 60
            });
        }
        catch (e) {
            await response.edit({ content: "Keine Reaktion bekommen, breche ab lol.", components: [] });
            return;
        }

        if (confirmation.roles.size === 0) {
            await response.edit({ content: "Keine Rollen ausgewählt :(", components: [] });
            return;
        }

        await response.edit({ content: "Alles klar, mach ich.", components: [] });

        const { allowedRoleIds, maxNumberOfPings, minRequiredReactions } = context.commandConfig.faulenzerPing;
        const roleIds = [...confirmation.roles.keys()].filter(roleId => allowedRoleIds.has(roleId));
        if (roleIds.length === 0) {
            await command.reply({ content: "Du hast keine erlaubten Rollen angegeben.", ephemeral: true });
            return;
        }

        const validRoles = (await Promise.all(roleIds.map(r => context.guild.roles.fetch(r)))).filter(role => !!role) as Role[];

        const usersInAllRoles = new Set<Snowflake>();
        for (const role of validRoles) {
            for (const user of role.members.keys()) {
                usersInAllRoles.add(user);
            }
        }

        const usersNotToNotify = await this.getUsersThatReactedToMessage(messageWithReactions);
        if (usersNotToNotify.size < minRequiredReactions) {
            await command.reply({ content: `Es gibt nur ${usersNotToNotify.size} Reaktionen, das ist zu wenig.` });
            return;
        }

        const usersToNotify = [...usersInAllRoles.values()].filter(user => !usersNotToNotify.has(user));

        if (usersToNotify.length > maxNumberOfPings) {
            await command.reply(`Offenbar interessieren sich so wenig dafür, dass das Limit von ${maxNumberOfPings} Pings überschritten wurde.\nEs würden ${usersToNotify.length} Leute gepingt.`);
            return;
        }

        await this.notifyUsers(messageWithReactions, "Hallo! Von euch kam hierauf noch keine Reaktion.", usersToNotify);
    }

    /*
    async promptTargetRoles(interaction: CommandInteraction, modalId: string) {
        const modal = new ModalBuilder()
            .setCustomId("myModal")
            .setTitle("My Modal")
            .addComponents(
                ...new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("role-to-ping")
                        .setPlaceholder("Rolle mit Faulenzern")
                )
            );

        await interaction.showModal(modal);
    }
    */

    async getUsersThatReactedToMessage(message: Message) {
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

    async notifyUsers(originalMessage: Message, message: string, usersToNotify: readonly Snowflake[]) {
        const userChunks = chunkArray(usersToNotify, 10);
        for (const users of userChunks) {
            const usersToNotifyMentions = users.map(userId => `<@${userId}>`).join(" ");

            // eslint-disable-next-line no-await-in-loop
            await originalMessage.reply({
                content: message + " " + usersToNotifyMentions,
                allowedMentions: { users }
            });
        }
    }
}
