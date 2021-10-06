/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { Model, DataTypes } from "sequelize";
import {v4 as uuidv4} from "uuid";

export default class Birthday extends Model {
    /**
     *
     * @param {import("discord.js").Snowflake} userId
     * @param {Date} birthday
     * @returns {Boolean | null} depending if the birthday is already in the database
     */
    static async insertBirthday(userId, birthday) {
        let items = await Birthday.getBirthday(userId);
        if(items.length > 0) return false;

        await Birthday.create({
            userId,
            birthday
        }).then(() => {
            return true;
        }).catch((e) => {
            return null;
        });
    }

    static async getBirthday(userId) {
        return await Birthday.findAll({
            where: {
                userId
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
