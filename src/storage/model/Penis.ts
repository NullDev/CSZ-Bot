/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { User } from "discord.js";
import { Model, DataTypes, Sequelize, Optional } from "sequelize";
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
                    unique: true,
                    fields: ["userId"]
                },
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
