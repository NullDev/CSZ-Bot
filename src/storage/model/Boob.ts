/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { User } from "discord.js";
import moment from "moment";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import log from "../../utils/logger";

export interface BoobAttributes {
    id: string;
    userId: string;
    measuredAt: Date;
    size: number;
}

export interface BoobCreationAttributes extends Optional<BoobAttributes, "id"> { }

export default class Boob extends Model<BoobAttributes, BoobCreationAttributes> implements BoobAttributes {
    declare id: string;
    declare userId: string;
    declare measuredAt: Date;
    declare size: number;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static longestRecentMeasurement = (): Promise<Boob | null> => {
        const startToday = moment().startOf("days");
        const startTomorrow = moment().add(1, "days").startOf("days");

        return Boob.max("size", {
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

    static fetchRecentMeasurement = (user: User): Promise<Boob | null> => {
        const startToday = moment().startOf("days");
        const startTomorrow = moment().add(1, "days").startOf("days");

        return Boob.findOne({
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

    static insertMeasurement = (user: User, size: number, measuredAt: Date = new Date()): Promise<Boob> => {
        log.debug(`Saving Boob Measurement for user ${user.id} with size ${size} from ${measuredAt}`);
        return Boob.create({
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
