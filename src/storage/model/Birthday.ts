import { Model, DataTypes, Op, type Sequelize } from "sequelize";
import type { Snowflake } from "discord.js";

import log from "../../utils/logger.js";

export type OneBasedMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export function isOneBasedMonth(v: unknown): v is OneBasedMonth {
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 12;
}

export default class Birthday extends Model {
    declare id: string;
    declare userId: Snowflake;
    declare day: number;
    declare month: OneBasedMonth;

    static initialize(sequelize: Sequelize) {
        Birthday.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                userId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                    unique: true,
                },
                day: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    validate: {
                        min: 1,
                        max: 31,
                    },
                },
                month: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    validate: {
                        min: 1,
                        max: 12,
                    },
                },
            },
            {
                sequelize,
                modelName: "Birthday",
            },
        );
    }
}
