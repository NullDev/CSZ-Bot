/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { Snowflake } from "discord.js";
import {DataTypes, Model, Optional, Sequelize} from "sequelize";
import {v4 as uuidv4} from "uuid";

import log from "../../utils/logger";

export interface NicknameAttributes {
    id: string;
    userId: string;
    nickName: string;
}

export interface NicknameCreationAttributes extends Optional<NicknameAttributes, "id"> { }

export default class Nickname extends Model {
    id!: string;
    userId!: string;
    nickName!: string;

    static async insertNickname(userId: Snowflake, nickName: string): Promise<Nickname> {
        log.debug(`Inserting Nickname  for user ${userId}  Nickname: ${nickName}`);
        if (await Nickname.nickNameExist(userId, nickName)) throw new Error("Nickname already exists");
        return Nickname.create({
            userId,
            nickName
        });
    }

    static getNicknames(userId: Snowflake): Promise<Nickname[]>{
        return Nickname.findAll({
            where: {
                userId
            }
        });
    }

    static async nickNameExist(userId: Snowflake, nickname: string) {
        return (await Nickname.findAll({
            where: {
                userId,
                nickName: nickname
            }
        })).length > 0;
    }


    static async allUsersAndNames() {
        let nicknames = await Nickname.findAll();

        return nicknames.reduce((acc, cur) => ({ // Das ding
            ...acc, //                 VV
            [cur.userId]: [...(acc[cur.userId] ?? []),
                cur.nickName]
        }), {} as Record<Snowflake, string[]>);
    }

    static deleteNickName(userId: Snowflake, nickName: string): Promise<number> {
        return Nickname.destroy({
            where: {
                userId,
                nickName
            }
        });
    }

    static deleteNickNames(userId: Snowflake): Promise<number> {
        return Nickname.destroy({
            where: {
                userId
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
                unique: false
            },
            nickName: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true
            }
        },
        {
            sequelize,
            modelName: "Nickname"
        });
    }
}
