/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { User } from "discord.js";
import moment from "moment";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import log from "../../utils/logger";

export interface ReminderAttributes {
    id: string;
    userId: string;
    remindAt: Date;
    messageId: string;
    channelId: string;
    guildId: string;
}

export interface ReminderCreationAttributes extends Optional<ReminderAttributes, "id"> { }

export default class Reminder extends Model<ReminderAttributes, ReminderCreationAttributes> implements ReminderAttributes {
    id!: string;
    userId!: string;
    remindAt!: Date;
    messageId!: string;
    channelId!: string;
    guildId!: string;

    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    static insertReminder = (user: User, messageId: string, channelId: string, guildId: string, remindAt: Date): Promise<ReminderAttributes> => {
        log.debug(`Saving Reminder Measurement for user ${user.id} on message ${messageId} for ${remindAt}`);
        return Reminder.create({
            userId: user.id,
            remindAt,
            messageId,
            channelId,
            guildId
        });
    };

    static async getCurrentReminders(): Promise<ReminderAttributes[]> {
        const now = moment();
        return Reminder.findAll({
            where: {
                remindAt: {
                    [Op.lte]: now.toDate()
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
                defaultValue: () => uuidv4(),
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
                allowNull: false
            },
            channelId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            guildId: {
                type: DataTypes.STRING(32),
                allowNull: false
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
