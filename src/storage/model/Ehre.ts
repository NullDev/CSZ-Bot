/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { DataTypes, Model, Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { Snowflake } from "discord.js";

export class EhreVotes extends Model {
    declare id: string;
    declare userId: string;

    static async hasVoted(userId: Snowflake): Promise<boolean> {
        console.log(userId);
        return (await EhreVotes.findAll({
            where: {
                userId
            }
        })).length > 0;
    }

    static async insertVote(userId: Snowflake) {
        return EhreVotes.create({
            userId
        }
        );
    }

    static async resetVotes() {
        return EhreVotes.destroy({
            where: {}
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
                unique: true
            }
        },
        {
            sequelize,
            modelName: "EhreVotes"
        });
    }
}


export class EhrePoints extends Model {
    declare id: string;
    declare userId: string;
    declare points: number;

    static async addPoints(userId: string, amount: number) {
        const storedpoints = await this.findPoints(userId);
        if (storedpoints === null) {
            return EhrePoints.create({
                userId,
                points: amount
            }
            );
        }
        return EhrePoints.update({
            points: storedpoints.points + amount
        }, {
            where: {
                userId
            }
        });
    }


    // eslint-disable-next-line no-use-before-define
    static async getUserInGroups(): Promise<EhreGroups> {
        const {rows, count} = await EhrePoints.findAndCountAll({
            order: [["points", "DESC"]]
        });
        const splitterIndex = (count - 1) * 0.2 + 1;
        return {
            best: rows[0],
            middle: rows.slice(1, splitterIndex),
            bottom: rows.slice(splitterIndex)
        };
    }

    static async findPoints(userId: string): Promise<EhrePoints | null> {
        return EhrePoints.findOne({
            where: {
                userId
            }
        });
    }

    static async deflation() {
        return EhrePoints.update({points: Sequelize.literal("points * 0.98")}, {where: {}});
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
                unique: true
            },
            points: {
                type: DataTypes.DOUBLE,
                allowNull: false
            }
        },
        {
            sequelize,
            modelName: "EhrePoints"
        });
    }
}

export interface EhreGroups {
    best: EhrePoints | undefined;
    middle: EhrePoints[];
    bottom: EhrePoints[];
}
