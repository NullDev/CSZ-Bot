/* Disabled due to sequelize's DataTypes */

import { Sequelize, Model, DataTypes, Optional, Op } from "sequelize";
import type { Snowflake } from "discord.js";

export interface WoisActionAttributes {
    id: string;
    messageId: Snowflake;
    reason: string;
    date: Date;
    interestedUsers: Snowflake[];
    isWoisgangAction: boolean;
}

export type WoisActionCreationAttributes = Optional<WoisActionAttributes, "id">;

export default class WoisAction
    extends Model<WoisActionAttributes, WoisActionCreationAttributes>
    implements WoisActionAttributes
{
    declare id: string;
    declare messageId: Snowflake;
    declare reason: string;
    declare date: Date;
    declare interestedUsers: Snowflake[];
    declare isWoisgangAction: boolean;

    static async insertWoisAction(
        messageId: Snowflake,
        reason: string,
        date: Date,
        isWoisgangAction = false,
    ): Promise<boolean> {
        try {
            await WoisAction.create({
                messageId,
                reason,
                date,
                interestedUsers: [],
                isWoisgangAction,
            });
            return true;
        } catch {
            return false;
        }
    }

    static async getWoisActionInRange(
        begin: Date,
        end: Date,
    ): Promise<WoisAction | null> {
        return WoisAction.findOne({
            where: {
                date: {
                    [Op.and]: {
                        [Op.gte]: begin,
                        [Op.lt]: end,
                    },
                },
            },
        });
    }

    static async getPendingWoisAction(
        before: Date,
    ): Promise<WoisAction | null> {
        return WoisAction.findOne({
            where: {
                date: {
                    [Op.and]: {
                        [Op.lte]: before,
                    },
                },
            },
        });
    }

    static async getWoisActionByMessageId(
        messageId: Snowflake,
    ): Promise<WoisAction | null> {
        return WoisAction.findOne({
            where: {
                messageId,
            },
        });
    }

    static async registerInterst(
        messageId: Snowflake,
        interestedUser: Snowflake,
        interested: boolean,
    ): Promise<boolean> {
        try {
            const woisAction =
                await WoisAction.getWoisActionByMessageId(messageId);
            if (!woisAction) return false;

            if (interested) {
                if (!woisAction.interestedUsers.includes(interestedUser)) {
                    woisAction.interestedUsers = [
                        ...woisAction.interestedUsers,
                        interestedUser,
                    ];
                }
            } else {
                // Filter instead of splice because a user might not be in the array
                woisAction.interestedUsers = woisAction.interestedUsers.filter(
                    user => user !== interestedUser,
                );
            }

            await woisAction.save();

            return true;
        } catch {
            return false;
        }
    }

    static initialize(sequelize: Sequelize) {
        WoisAction.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                messageId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                    unique: true,
                },
                reason: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                date: {
                    type: DataTypes.DATE(),
                    allowNull: false,
                },
                interestedUsers: {
                    type: DataTypes.JSON(),
                },
                isWoisgangAction: {
                    type: DataTypes.BOOLEAN(),
                },
            },
            {
                sequelize,
                modelName: "WoisAction",
            },
        );
    }
}
