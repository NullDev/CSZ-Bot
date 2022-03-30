/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import type { Snowflake } from "discord.js";
import { Model, DataTypes, Op, type Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import log from "../../utils/logger";

export type OneBasedMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export function isOneBasedMonth(v: unknown): v is OneBasedMonth {
    return typeof v === "number"
    && Number.isInteger(v)
    && v >= 1
    && v <= 12;
}

export default class Birthday extends Model {
    declare id: string;
    declare userId: Snowflake;
    declare day: number;
    declare month: OneBasedMonth;

    static async insertBirthday(userId: Snowflake, day: number, month: OneBasedMonth) {
        const isoBirthdayStr = month.toString().padStart(2, "0") + "-" + day.toString().padStart(2, "0");

        log.debug(`Inserting Birthday for user ${userId} on YYYY-${isoBirthdayStr} (YYYY-MM-DD)`);

        const item = await Birthday.getBirthday(userId);

        if(item !== null) throw new Error("Birthday for this user already exists");

        return Birthday.create({
            userId,
            day,
            month
        });
    }

    static async getBirthday(userId: Snowflake) {
        return Birthday.findOne({
            where: { userId }
        });
    }

    static async getTodaysBirthdays() {
        const today = moment();
        return Birthday.findAll({
            where: {
                day: {
                    [Op.eq]: today.date()
                },
                month: {
                    [Op.eq]: today.month() + 1
                }
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
                allowNull: false,
                unique: true
            },
            day: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 31
                }
            },
            month: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 12
                }
            }
        },
        {
            sequelize,
            modelName: "Birthday"
        });
    }
}
