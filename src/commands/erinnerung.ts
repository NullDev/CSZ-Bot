import { Client, TextBasedChannel } from "discord.js";
import { MessageCommand } from "./command";
import * as Sugar from "sugar";
import logger from "../utils/logger";
import Reminder, { ReminderAttributes } from "../storage/model/Reminder";
import type { ProcessableMessage } from "../handler/cmdHandler";
import { BotContext } from "../context";

require("sugar/locales/de");

export class ErinnerungCommand implements MessageCommand {
    name = "erinnerung";
    description = "Setzt eine Erinnerung für dich";

    async handleMessage(message: ProcessableMessage, client: Client<boolean>, context: BotContext): Promise<void> {
        // TODO: Create utility function that removes the command prefix for easier parsing
        const param = message.content.split(`${context.rawConfig.bot_settings.prefix.command_prefix}${this.name} `)[1];
        if (!param) {
            await message.reply("Brudi ich muss schon wissen wann ich dich erinnern soll");
            return;
        }

        try {
            const date = Sugar.Date.create(param, {
                locale: "de",
                future: true
            });

            if (Number.isNaN(date.getTime()) || !Number.isFinite(date.getTime())) {
                throw new Error("Danke JS");
            }

            if (date < new Date()) {
                await message.reply("Brudi das sollte schon in der Zukunft liegen, bin ich Marty McFly oder wat?");
                return;
            }

            const messageId = message.reference?.messageId ?? message.id;
            const refMessage = message.reference ?? message;

            await Reminder.insertReminder(message.member.user, messageId, refMessage.channelId, refMessage.guildId!, date);
            await message.reply(`Ok brudi, werd dich <t:${(date.getTime() / 1000) | 0}:R> dran erinnern. Außer ich kack ab lol, dann mach ich das später (vielleicht)`);
        }
        catch (err) {
            logger.error(`Couldn't parse date from message ${message.content} due to`, err);
            await message.reply("Brudi was ist das denn für ne Datumsangabe? Gib was ordentliches an");
        }
    }
}

const sendReminder = async(reminder: ReminderAttributes, context: BotContext) => {
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
        if (!channel.isText()) {
            throw new Error(`Channel ${reminder.channelId} is not a text channel`);
        }
        const message = await (channel as TextBasedChannel).messages.fetch(reminder.messageId);
        const user = await guild.members.fetch(reminder.userId);

        await message.reply({
            content: `${user} du wolltest daran erinnern werden oder wat`,
            allowedMentions: {
                repliedUser: false,
                users: [user.id]
            }
        });
    }
    catch (err) {
        logger.error("Couldn't send reminder. Removing it...", err);
    }
    await Reminder.removeReminder(reminder.id);
};

export const reminderHandler = async(context: BotContext) => {
    const reminders = await Reminder.getCurrentReminders();
    for (const reminder of reminders) {
        try {
            await sendReminder(reminder, context);
        }
        catch (err) {
            logger.error("Couldn't retrieve reminders because of", err);
        }
    }
};
