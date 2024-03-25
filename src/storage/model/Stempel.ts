import { type Sequelize, Model, DataTypes, type Optional } from "sequelize";
import type { Snowflake } from "discord.js";

export interface StempelAttributes {
    id: string;
    invitator: Snowflake;
    invitedMember: Snowflake;
}

export type StempelCreationAttributes = Optional<StempelAttributes, "id">;

export default class Stempel
    extends Model<StempelAttributes, StempelCreationAttributes>
    implements StempelAttributes
{
    declare id: string;
    declare invitator: Snowflake;
    declare invitedMember: Snowflake;

    static initialize(sequelize: Sequelize) {
        Stempel.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                invitator: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                invitedMember: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                    unique: true,
                },
            },
            {
                sequelize,
                modelName: "Stempel",
            },
        );
    }
}
