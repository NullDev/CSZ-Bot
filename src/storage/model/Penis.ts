/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { User } from "discord.js";
import moment from "moment";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import * as log from "../../utils/logger";

export interface PenisAttributes {
    id: string;
    userId: string;
    measuredAt: Date;
    size: number;
}

export interface PenisCreationAttributes extends Optional<PenisAttributes, "id"> { }

export default class Penis extends Model<PenisAttributes, PenisCreationAttributes> implements PenisAttributes {
    id!: string;
    userId!: string;
    measuredAt!: Date;
    size!: number;

    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    static longestRecentMeasurement = (): Promise<Penis | null> => {
        const startToday = moment().startOf("days");
        const startTomorrow = moment().add(1, "days").startOf("days");

        return Penis.max("size", {
            where: {
                measuredAt: {
                    [Op.and]: {
                        [Op.gte]: startToday.toDate(),
                        [Op.lt]: startTomorrow.toDate()
                    }
                }
            }
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
                        [Op.lt]: startTomorrow.toDate()
                    }
                }
            }
        });
    };

    static insertMeasurement = (user: User, size: number, measuredAt: Date = new Date()): Promise<Penis> => {
        log.debug(`Saving Penis Measurement for user ${user.id} with size ${size} from ${measuredAt}`);
        return Penis.create({
            userId: user.id,
            measuredAt,
            size
        });
    };

    static initialize(sequelize: Sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuidv4(),
                primaryKey: true
            },
            userId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            measuredAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            size: {
                type: DataTypes.INTEGER,
                allowNull: false
            }
        }, {
            sequelize,
            indexes: [
                {
                    using: "BTREE",
                    fields: [
                        {
                            name: "measuredAt",
                            order: "ASC"
                        }
                    ]
                }
            ]
        });
    }
}
