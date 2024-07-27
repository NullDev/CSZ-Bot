import {
    type CacheType,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type TextBasedChannel,
    TimestampStyles,
    time as formatTime,
} from "discord.js";
import * as chrono from "chrono-node";

import type { MessageCommand, ApplicationCommand } from "./command.js";
import type { ProcessableMessage } from "../service/command.js";
import type { BotContext } from "../context.js";
import log from "@log";
import * as reminderService from "../storage/reminders.js";
import type { Reminder } from "../storage/db/model.js";

import { ensureChatInputCommand } from "../utils/interactionUtils.js";

const validateDate = (date: Date): true | string => {
    if (Number.isNaN(date.getTime()) || !Number.isFinite(date.getTime())) {
        throw new Error("Danke JS");
    }

    const now = new Date();
    if (date < now) {
        return "Brudi das sollte schon in der Zukunft liegen, bin ich Marty McFly oder wat?";
    }

    const diff = Math.round(date.getTime() - now.getTime());
    if (diff < 60000) {
        return "Ach komm halt doch dein Maul";
    }

    return true;
};

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

    async handleInteraction(command: CommandInteraction<CacheType>) {
        const cmd = ensureChatInputCommand(command);
        const time = cmd.options.getString("time", true);
        const note = cmd.options.getString("note");
        if (cmd.guildId === null) {
            await cmd.reply("Brudi ich muss schon wissen wo ich dich erinnern soll");
            return;
        }

        try {
            const date = chrono.de.parseDate(time);
            const valid = validateDate(date);
            if (valid !== true) {
                await cmd.reply(valid);
                return;
            }

            await reminderService.insertStaticReminder(
                cmd.user,
                cmd.channelId,
                cmd.guildId,
                date,
                note,
            );
            await cmd.reply(
                `Ok brudi, werd dich ${formatTime(
                    date,
                    TimestampStyles.RelativeTime,
                )} dran erinnern. Außer ich kack ab lol, dann mach ich das später (vielleicht)`,
            );
        } catch (err) {
            log.error(err, `Couldn't parse date from message ${time} due to`);
            await cmd.reply("Brudi was ist das denn für ne Datumsangabe? Gib was ordentliches an");
        }
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        // TODO: Create utility function that removes the command prefix for easier parsing
        const param = message.content.split(`${context.prefix.command}${this.name} `)[1];
        if (!param) {
            await message.reply("Brudi ich muss schon wissen wann ich dich erinnern soll");
            return;
        }

        try {
            const date = chrono.de.parseDate(param);
            const valid = validateDate(date);
            if (valid !== true) {
                await message.reply(valid);
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
                date,
            );
            await message.reply(
                `Ok brudi, werd dich ${formatTime(
                    date,
                    TimestampStyles.RelativeTime,
                )} dran erinnern. Außer ich kack ab lol, dann mach ich das später (vielleicht)`,
            );
        } catch (err) {
            log.error(err, `Couldn't parse date from message ${message.content} due to`);
            await message.reply(
                "Brudi was ist das denn für ne Datumsangabe? Gib was ordentliches an",
            );
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
        const textChannel = channel as TextBasedChannel;
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
