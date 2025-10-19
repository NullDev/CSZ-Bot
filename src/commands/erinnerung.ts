import {
    type CacheType,
    type CommandInteraction,
    ContainerBuilder,
    type GuildTextBasedChannel,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandStringOption,
    TimestampStyles,
    time as formatTime,
} from "discord.js";
import * as chrono from "chrono-node";
import * as sentry from "@sentry/node";

import type { MessageCommand, ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import type { Reminder } from "@/storage/db/model.js";
import type { ProcessableMessage } from "@/service/command.js";
import log from "@log";
import * as reminderService from "@/storage/reminders.js";
import * as dateUtils from "@/utils/dateUtils.js";

import { ensureChatInputCommand } from "@/utils/interactionUtils.js";

const validateDate = (date: Date): true | string => {
    if (!dateUtils.isValidDate(date)) {
        throw new Error("Danke JS");
    }

    if (date.getTime() < Date.now()) {
        return "Brudi das sollte schon in der Zukunft liegen, bin ich Marty McFly oder wat?";
    }

    const diff = Math.round(date.getTime() - Date.now());
    if (diff < 60_000) {
        return "Ach komm halt doch dein Maul";
    }
    return true;
};

function getSamplesComponents() {
    const samples = ["in 2 Stunden", "morgen um 15 Uhr", "nächsten Freitag"];

    return new ContainerBuilder().addTextDisplayComponents(
        t => t.setContent("Brudi was ist das denn für ne Datumsangabe? Gib was ordentliches an."),
        t => t.setContent("Was ordentliches ist z. B.:"),
        t => t.setContent(samples.map(s => `- \`${s}\``).join("\n")),
    );
}

function parsDateSpec(param: string): Date | string {
    let remindAt = chrono.de.parseDate(param);
    const validationResult = validateDate(remindAt);
    if (validationResult === true) {
        return remindAt;
    }

    if (!param.startsWith("in")) {
        remindAt = chrono.de.parseDate(`in ${param}`);
    }

    const secondAttemptValidation = validateDate(remindAt);
    if (secondAttemptValidation === true) {
        return remindAt;
    }
    return secondAttemptValidation;
}

export default class ErinnerungCommand implements MessageCommand, ApplicationCommand {
    name = "erinnerung";
    description = "Setzt eine Erinnerung für dich";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("time")
                .setDescription("Wann ich dich erinnern soll")
                .setRequired(true),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("note")
                .setDescription("Woran ich dich erinnern soll")
                .setRequired(false),
        );

    async handleInteraction(interaction: CommandInteraction<CacheType>) {
        const command = ensureChatInputCommand(interaction);
        const remindAtStr = command.options.getString("time", true);
        const note = command.options.getString("note");
        if (command.guildId === null) {
            await interaction.reply({
                content: "Brudi ich muss schon wissen wo ich dich erinnern soll",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            const parsedDate = parsDateSpec(remindAtStr);
            if (typeof parsedDate === "string") {
                await interaction.reply({
                    content: parsedDate,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await reminderService.insertStaticReminder(
                command.user,
                command.channelId,
                command.guildId,
                parsedDate,
                note,
            );

            await command.reply(
                `Ok brudi, werd dich ${formatTime(
                    parsedDate,
                    TimestampStyles.RelativeTime,
                )} dran erinnern. Außer ich kack ab lol, dann mach ich das später (vielleicht)`,
            );
        } catch {
            await interaction.reply({
                components: [getSamplesComponents()],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        // TODO: Create utility function that removes the command prefix for easier parsing
        const param = message.content.slice(`${context.prefix.command}${this.name}`.length).trim();
        if (!param) {
            await message.reply("Brudi ich muss schon wissen wann ich dich erinnern soll");
            return;
        }

        try {
            const parsedDate = parsDateSpec(param);
            if (typeof parsedDate === "string") {
                await message.reply(parsedDate);
                return;
            }

            const messageId = message.reference?.messageId ?? message.id;
            const refMessage = message.reference ?? message;
            const guildId = refMessage.guildId;
            if (guildId === undefined) {
                throw new Error("GuildId is undefined");
            }

            await reminderService.insertMessageReminder(
                message.member.user,
                messageId,
                refMessage.channelId,
                guildId,
                parsedDate,
            );
            await message.reply(
                `Ok brudi, werd dich ${formatTime(
                    parsedDate,
                    TimestampStyles.RelativeTime,
                )} dran erinnern. Außer ich kack ab lol, dann mach ich das später (vielleicht)`,
            );
        } catch {
            await message.reply({
                components: [getSamplesComponents()],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }
    }
}

const sendReminder = async (reminder: Reminder, context: BotContext) => {
    try {
        // Not using `context.guild`, so we can keep reminders cross-guild
        const guild = context.client.guilds.cache.get(reminder.guildId);
        if (guild === undefined) {
            throw new Error(`Guild ${reminder.guildId} couldn't be found`);
        }

        const channel = guild.channels.cache.get(reminder.channelId);
        if (channel === undefined) {
            throw new Error(`Channel ${reminder.channelId} couldn't be found`);
        }
        if (!channel.isTextBased()) {
            throw new Error(`Channel ${reminder.channelId} is not a text channel`);
        }
        const textChannel = channel as GuildTextBasedChannel;
        const user = await guild.members.fetch(reminder.userId);
        const note = reminder.reminderNote || "Lol du Vollidiot hast nichts angegeben";

        if (!reminder.messageId) {
            await textChannel.send({
                content: `${user} du wolltest an etwas erinnert werden. Es ist: ${note}`,
                allowedMentions: {
                    users: [user.id],
                },
            });
            await reminderService.removeReminder(reminder.id);
            return;
        }

        const message = await textChannel.messages.fetch(reminder.messageId);

        await message.reply({
            content: `${user} du wolltest daran erinnern werden oder wat`,
            allowedMentions: {
                repliedUser: false,
                users: [user.id],
            },
        });
    } catch (err) {
        log.error(err, "Couldn't send reminder. Removing it...");
        sentry.captureException(err);
    }
    await reminderService.removeReminder(reminder.id);
};

export const reminderHandler = async (context: BotContext) => {
    const reminders = await reminderService.getCurrentReminders();
    const results = await Promise.allSettled(
        reminders.map(reminder => sendReminder(reminder, context)),
    );
    const rejections = results.filter(
        result => result.status === "rejected",
    ) as PromiseRejectedResult[];
    for (const rejection of rejections) {
        log.error(rejection.reason, "Couldn't retrieve reminders because of");
    }
};
