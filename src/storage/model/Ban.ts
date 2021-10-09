import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export interface BanAttributes {
    id: string;
    userId: string;
    bannedUntil: number;
}

export interface BanCreationAttributes extends Optional<BanAttributes, "id"> { }

export default class Ban extends Model<BanAttributes, BanCreationAttributes> implements BanAttributes {
    id!: string;
    userId!: string;
    bannedUntil!: number;

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
            bannedUntil: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        }, {
            sequelize,
            indexes: [
                {
                    unique: true,
                    fields: ["bannedUntil"]
                }
            ]
        });
    }
}