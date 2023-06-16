/* Disabled due to sequelize's DataTypes */

import moment from "moment";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import type { User } from "discord.js";

import { Radius } from "../../commands/penis.js";
import log from "../../utils/logger.js";

export interface PenisAttributes {
    id: string;
    userId: string;
    measuredAt: Date;
    size: number;
    diameter: Radius;
}

export type PenisCreationAttributes = Optional<PenisAttributes, "id">;

export default class Penis
    extends Model<PenisAttributes, PenisCreationAttributes>
    implements PenisAttributes
{
    declare id: string;
    declare userId: string;
    declare measuredAt: Date;
    declare size: number;
    declare diameter: Radius;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static getAveragePenisSizes = async (): Promise<Record<string, number>> => {
        // Everything hacky, but I just want to implement it.
        const averageObj: Record<string, number> = {};
        // @ts-ignore
        const result: { id: string; avgSize: number }[] = await Penis.findAll({
            attributes: [
                "id",
                [Sequelize.fn("AVG", Sequelize.col("size")), "avgSize"],
            ],
            group: ["id"],
        });

        for (const res of result) {
            averageObj[res.id] = res.avgSize;
        }

        return averageObj;
    };

    static longestRecentMeasurement = (): Promise<Penis | null> => {
        const startToday = moment().startOf("days");
        const startTomorrow = moment().add(1, "days").startOf("days");

        return Penis.max("size", {
            where: {
                measuredAt: {
                    [Op.and]: {
                        [Op.gte]: startToday.toDate(),
                        [Op.lt]: startTomorrow.toDate(),
                    },
                },
            },
        });
    };

    static fetchRecentMeasurement = (user: User): Promise<Penis | null> => {
        const startToday = moment().startOf("days");
        const startTomorrow = moment().add(1, "days").startOf("days");

        return Penis.findOne({
            where: {
                userId: user.id,
                measuredAt: {
                    [Op.and]: {
                        [Op.gte]: startToday.toDate(),
                        [Op.lt]: startTomorrow.toDate(),
                    },
                },
            },
        });
    };

    static insertMeasurement = (
        user: User,
        size: number,
        diameter: Radius,
        measuredAt: Date = new Date(),
    ): Promise<Penis> => {
        log.debug(
            `Saving Penis Measurement for user ${user.id} with size ${size} from ${measuredAt}`,
        );
        return Penis.create({
            userId: user.id,
            measuredAt,
            size,
            diameter,
        });
    };

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
                },
                measuredAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                size: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                diameter: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
            },
            {
                sequelize,
                indexes: [
                    {
                        using: "BTREE",
                        fields: [
                            {
                                name: "measuredAt",
                                order: "ASC",
                            },
                        ],
                    },
                ],
            },
        );
    }
}
