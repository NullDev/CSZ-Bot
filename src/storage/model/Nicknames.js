/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import {DataTypes, Model} from "sequelize";
import {v4 as uuidv4} from "uuid";

import log from "../../utils/logger";


export default class Nicknames extends Model {
    /**
     *
     * @param {import("discord.js").Snowflake} userId
     * @param {string} nickName
     * @returns {Promise<Nicknames>}
     */
    static async insertNickname(userId, nickName) {
        log.debug(`Inserting Nickname  for user ${userId}  Nickname: ${nickName}`);
        if (await Nicknames.nickNameExist(userId, nickName)) throw new Error("Nickname already exists");
        return Nicknames.create({
            userId,
            nickName
        });
    }

    /**
     * @param {import("discord.js").Snowflake} userId
     * @returns {Promise<Nicknames | null>}
     */
    static async getNicknames(userId) {
        return Nicknames.findAll({
            where: {
                userId
            }
        });
    }

    static async nickNameExist(userId, nickname) {
        return await Nicknames.findAll({
            where: {
                userId,
                nickname
            }
        }) === null;
    }


    static async allUsersAndNames() {
        let nicknames = await Nicknames.findAll();
        return nicknames.reduce((acc, cur) => ({ // Das ding
            ...acc, //                 VV
            [cur.userId]: [...(acc[cur.userId] ?? []),
                cur.nickName]
        }), {});
    }

    static async deleteNickName(userId, nickname) {
        return Nicknames.destroy({
            where: {
                userId,
                nickname
            }
        });
    }

    static async deleteNickNames(userId) {
        return Nicknames.destroy({
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
                unique: false
            },
            nickName: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: false
            }
        },
        {
            sequelize,
            modelName: "Nickname"
        });
    }
}
