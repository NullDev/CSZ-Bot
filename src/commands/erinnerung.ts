import { Client, Message, TextBasedChannel } from "discord.js";
import { getConfig } from "../utils/configHandler";
import { MessageCommand } from "./command";
import * as Sugar from "sugar";
import logger from "../utils/logger";
import Reminder from "../storage/model/Reminder";

const config = getConfig();
require("sugar/locales/de");

export class ErinnerungCommand implements MessageCommand {
    name = "erinnerung";
    description = "Setzt eine Erinnerung für dich";

    async handleMessage(message: Message<boolean>, client: Client<boolean>): Promise<void> {
        const param = message.content.split(`${config.bot_settings.prefix.command_prefix}${this.name} `)[1];
        if (!param) {
            await message.reply("Brudi ich muss schon wissen wann ich dich erinnern soll");
            return;
        }
        try {
            const date = Sugar.Date.create(param, {
                locale: "de",
                future: true
            });

            if (isNaN(date.getTime())) {
                throw new Error("Danke JS");
            }

            const messageId = message.reference === null ? message.id : message.reference.messageId!;
            const refMessage = message.reference === null ? message : message.reference;

            await Reminder.insertReminder(message.member!.user, messageId, refMessage.channelId, refMessage.guildId!, date);
            await message.reply("Ok brudi, werd dich dran erinnern. Außer ich kack ab lol, dann mach ich das später");
        }
        catch (err) {
            logger.error(`Couldn't parse date from message ${message.content} due to ${err}`);
            await message.reply("Brudi was ist das denn für ne Datumsangabe? Gib was ordentliches an");
            return;
        }
    }
}

export const reminderHandler = async(client: Client) => {
    const reminders = await Reminder.getCurrentReminders();
    if (reminders === null) {
        return;
    }
    reminders.forEach(async(reminder) => {
        try {
            const guild = client.guilds.cache.get(reminder.guildId);
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
                    users: [ user.id ]
                }
            });
        }
        catch(err) {
            logger.error(`Couldn't send reminder due to ${err}. Removing it...`);
        }
        await Reminder.removeReminder(reminder.id);
    });
};
