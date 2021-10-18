/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { Model, DataTypes, Op } from "sequelize";
import {v4 as uuidv4} from "uuid";
import moment from "moment";

export default class Birthday extends Model {
    /**
     *
     * @param {import("discord.js").Snowflake} userId
     * @param {Date} birthday
     * @returns {Boolean | null} depending if the birthday is already in the database
     */
    static async insertBirthday(userId, birthday) {
        let item = await Birthday.getBirthday(userId);

        if(item !== null) return false;
        let isNewItem = null;
        await Birthday.create({
            userId,
            birthday
        }).then(() => {
            isNewItem = true;
        }).catch(() => {
            isNewItem = null;
        });
        return isNewItem;
    }

    static async getBirthday(userId) {
        return await Birthday.findOne({
            where: {
                userId
            }
        });
    }

    static async getTodaysBirthdays() {
        return await Birthday.findAll({
            where: {
                birthday: {
                    [Op.eq]: moment().year(1900).utcOffset(0).set({
                        hour: 0,
                        minute: 0,
                        second: 0,
                        millisecond: 0
                    }).format("YYYY-MM-DD HH:mm:ss.SSS Z")
                }
            }
        });
    }

    static initialize(sequelize) {
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
            birthday: {
                type: DataTypes.DATE,
                allowNull: false
            }
        },
        {
            sequelize,
            modelName: "Birthday"
        });
    }
}
