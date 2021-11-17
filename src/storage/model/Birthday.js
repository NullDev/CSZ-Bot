/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { Model, DataTypes, Op } from "sequelize";
import {v4 as uuidv4} from "uuid";
import moment from "moment";
import * as log from "../../utils/logger";


export default class Birthday extends Model {
    /**
     *
     * @param {import("discord.js").Snowflake} userId
     * @param {number} day
     * @param {number} month
     * @returns {Promise<Boolean | null>} depending if the birthday is already in the database
     */
    static async insertBirthday(userId, day, month) {
        let item = await Birthday.getBirthday(userId);

        if(!!item) return false;
        let isNewItem = null;
        await Birthday.create({
            userId,
            day,
            month
        }).then(() => {
            isNewItem = true;
        }).catch(e => {
            log.error(e);
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
        const today = moment();
        return await Birthday.findAll({
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
