/* Disabled due to sequelize's DataTypes */

import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import type { Snowflake } from "discord.js";

import log from "../../utils/logger.js";

export interface NicknameAttributes {
    id: string;
    userId: string;
    nickName: string;
}

export type NicknameCreationAttributes = Optional<NicknameAttributes, "id">;

export default class Nickname extends Model {
    declare id: string;
    declare userId: string;
    declare nickName: string;

    static async insertNickname(
        userId: Snowflake,
        nickName: string,
    ): Promise<Nickname> {
        log.debug(
            `Inserting Nickname for user "${userId}" Nickname: "${nickName}"`,
        );
        if (await Nickname.nickNameExist(userId, nickName))
            throw new Error("Nickname already exists");
        return Nickname.create({
            userId,
            nickName,
        });
    }

    static getNicknames(userId: Snowflake): Promise<Nickname[]> {
        return Nickname.findAll({
            where: {
                userId,
            },
        });
    }

    static async nickNameExist(userId: Snowflake, nickname: string) {
        return (
            (
                await Nickname.findAll({
                    where: {
                        userId,
                        nickName: nickname,
                    },
                })
            ).length > 0
        );
    }

    static async allUsersAndNames() {
        const nicknames = await Nickname.findAll();

        return nicknames.reduce(
            (acc, cur) => ({
                // Das ding
                // biome-ignore lint/performance/noAccumulatingSpread: This should be ok.
                ...acc, //                 VV
                [cur.userId]: [...(acc[cur.userId] ?? []), cur.nickName],
            }),
            {} as Record<Snowflake, string[]>,
        );
    }

    static deleteNickName(
        userId: Snowflake,
        nickName: string,
    ): Promise<number> {
        return Nickname.destroy({
            where: {
                userId,
                nickName,
            },
        });
    }

    static deleteNickNames(userId: Snowflake): Promise<number> {
        return Nickname.destroy({
            where: {
                userId,
            },
        });
    }

    static initialize(sequelize: Sequelize) {
        this.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                userId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                    unique: false,
                },
                nickName: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                    unique: true,
                },
            },
            {
                sequelize,
                modelName: "Nickname",
            },
        );
    }
}
