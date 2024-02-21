import { DataTypes, Model, Op, Sequelize } from "sequelize";
import { Snowflake } from "discord.js";

import log from "../../utils/logger.js";

export class EhreVotes extends Model {
    declare id: string;
    declare userId: string;

    static async hasVoted(userId: Snowflake): Promise<boolean> {
        return (
            (
                await EhreVotes.findAll({
                    where: {
                        userId,
                    },
                })
            ).length > 0
        );
    }

    static async insertVote(userId: Snowflake) {
        return EhreVotes.create({
            userId,
        });
    }

    static async resetVotes() {
        log.debug("Entered `EhreVotes#resetVotes`");

        return EhreVotes.destroy({
            where: {},
        });
    }

    static initialize(sequelize: Sequelize) {
        EhreVotes.init(
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
            },
            {
                sequelize,
                modelName: "EhreVotes",
            },
        );
    }
}

export class EhrePoints extends Model {
    declare id: string;
    declare userId: string;
    declare points: number;

    static async addPoints(userId: string, amount: number) {
        const storedpoints = await EhrePoints.findPoints(userId);
        if (storedpoints === null) {
            return EhrePoints.create({
                userId,
                points: amount,
            });
        }
        return EhrePoints.update(
            {
                points: storedpoints.points + amount,
            },
            {
                where: {
                    userId,
                },
            },
        );
    }

    static async getUserInGroups(): Promise<EhreGroups> {
        const { rows, count } = await EhrePoints.findAndCountAll({
            where: { points: { [Op.gte]: 0.1 } },
            order: [["points", "DESC"]],
        });

        const splitterIndex = (count - 1) * 0.2 + 1;
        return {
            best: rows[0],
            middle: rows.slice(1, splitterIndex),
            bottom: rows.slice(splitterIndex),
        };
    }

    static async findPoints(userId: string): Promise<EhrePoints | null> {
        return EhrePoints.findOne({
            where: {
                userId,
            },
        });
    }

    static async deflation() {
        log.debug("Entered `EhrePoints#deflation`");

        return EhrePoints.update(
            { points: Sequelize.literal("points * 0.98") },
            { where: {} },
        );
    }

    static initialize(sequelize: Sequelize) {
        EhrePoints.init(
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
                points: {
                    type: DataTypes.DOUBLE,
                    allowNull: false,
                },
            },
            {
                sequelize,
                modelName: "EhrePoints",
            },
        );
    }
}

export interface EhreGroups {
    best: EhrePoints | undefined;
    middle: EhrePoints[];
    bottom: EhrePoints[];
}
