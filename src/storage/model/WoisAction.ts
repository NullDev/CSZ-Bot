/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { Sequelize, Model, DataTypes, Optional, Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import type { Snowflake } from "discord.js";

export interface WoisActionAttributes {
    id: string;
    messageId: Snowflake;
    reason: string;
    date: Date;
    interestedUsers: Snowflake[];
}

export interface WoisActionCreationAttributes
    extends Optional<WoisActionAttributes, "id"> {}

export default class WoisAction
    extends Model<WoisActionAttributes, WoisActionCreationAttributes>
    implements WoisActionAttributes
{
    declare id: string;
    declare messageId: Snowflake;
    declare reason: string;
    declare date: Date;
    declare interestedUsers: Snowflake[];

    static async insertWoisAction(
        messageId: Snowflake,
        reason: string,
        date: Date
    ): Promise<boolean> {
        try {
            await WoisAction.create({
                messageId,
                reason,
                date,
                interestedUsers: [],
            });
            return true;
        } catch {
            return false;
        }
    }

    static async getWoisActionInRange(
        begin: Date,
        end: Date
    ): Promise<WoisAction | null> {
        return WoisAction.findOne({
            where: {
                date: {
                    [Op.between]: [begin, end],
                },
            },
        });
    }

    static async registerInterstedUser(
        messageId: Snowflake,
        interestedUser: Snowflake
    ): Promise<boolean> {
        try {
            const woisAction = await WoisAction.findOne({
                where: {
                    messageId,
                },
            });
            if (!woisAction) return false;

            woisAction.interestedUsers.push(interestedUser);
            await woisAction.save();

            return true;
        } catch {
            return false;
        }
    }

    static initialize(sequelize: Sequelize) {
        this.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => uuidv4(),
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
                    type: DataTypes.ARRAY(DataTypes.STRING(32)),
                },
            },
            {
                sequelize,
                modelName: "WoisAction",
            }
        );
    }
}
