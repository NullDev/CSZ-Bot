/* Disabled due to sequelize's DataTypes */


import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import type { User } from "discord.js";

import log from "../../utils/logger.js";

export interface ReminderAttributes {
    id: string;
    userId: string;
    remindAt: Date;
    messageId: string | null;
    channelId: string;
    guildId: string;
    reminderNote: string | null;
}

export type ReminderCreationAttributes = Optional<ReminderAttributes, "id">

export default class Reminder extends Model<ReminderAttributes, ReminderCreationAttributes> implements ReminderAttributes {
    declare id: string;
    declare userId: string;
    declare remindAt: Date;
    declare messageId: string | null;
    declare reminderNote: string | null;
    declare channelId: string;
    declare guildId: string;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static insertStaticReminder = (user: User, channelId: string, guildId: string, remindAt: Date, reminderNote: string | null = null): Promise<ReminderAttributes> => {
        log.debug(`Saving Reminder Measurement for user ${user.id} for ${remindAt}`);
        return Reminder.create({
            userId: user.id,
            remindAt,
            channelId,
            guildId,
            reminderNote,
            messageId: null
        });
    };

    static insertMessageReminder = (user: User, messageId: string, channelId: string, guildId: string, remindAt: Date): Promise<ReminderAttributes> => {
        log.debug(`Saving Reminder Measurement for user ${user.id} on message ${messageId} for ${remindAt}`);
        return Reminder.create({
            userId: user.id,
            remindAt,
            messageId,
            channelId,
            guildId,
            reminderNote: null
        });
    };

    static async getCurrentReminders(): Promise<ReminderAttributes[]> {
        return Reminder.findAll({
            where: {
                remindAt: {
                    [Op.lte]: new Date()
                }
            }
        });
    }

    static async removeReminder(id: string): Promise<number> {
        return Reminder.destroy({
            where: {
                id
            }
        });
    }

    static initialize(sequelize: Sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => crypto.randomUUID(),
                primaryKey: true
            },
            userId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            remindAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            messageId: {
                type: DataTypes.STRING(32),
                allowNull: true
            },
            channelId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            guildId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            reminderNote: {
                type: DataTypes.STRING(32),
                allowNull: true
            }
        }, {
            sequelize,
            indexes: [
                {
                    using: "BTREE",
                    fields: [
                        {
                            name: "remindAt",
                            order: "ASC"
                        }
                    ]
                }
            ]
        });
    }
}
