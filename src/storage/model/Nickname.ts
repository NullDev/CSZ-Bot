import { DataTypes, Model, type Optional, type Sequelize } from "sequelize";
import type { Snowflake } from "discord.js";

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

    static getNicknames(userId: Snowflake): Promise<Nickname[]> {
        return Nickname.findAll({
            where: {
                userId,
            },
        });
    }
    static initialize(sequelize: Sequelize) {
        Nickname.init(
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
