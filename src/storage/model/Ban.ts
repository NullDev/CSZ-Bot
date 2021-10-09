import type { User } from "discord.js";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export interface BanAttributes {
    id: string;
    userId: string;
    reason: string | null;
    bannedUntil: number;
    isSelfBan: boolean;
}

export interface BanCreationAttributes extends Optional<BanAttributes, "id"> { }

export default class Ban extends Model<BanAttributes, BanCreationAttributes> implements BanAttributes {
    id!: string;
    userId!: string;
    reason!: string | null;
    bannedUntil!: number;
    isSelfBan!: boolean;

    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    static persist = (user: User, until: number, isSelfBan: boolean, reason: string | null = null) => {
        return Ban.create({
            userId: user.id,
            reason,
            bannedUntil: until,
            isSelfBan
        });
    };

    static remove = (user: User) => Ban.destroy({ where: { userId: user.id } });

    static findExisting = (user: User) => Ban.findOne({ where: { userId: user.id } });

    static findExpiredBans = (now: number) => Ban.findAll({
        where: {
            bannedUntil: {
                [Op.gt]: 0,
                [Op.lte]: now
            }
        },
    });

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
            reason: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            bannedUntil: {
                type: DataTypes.BIGINT(), // 64 bit integer, used for unix timestamps
                allowNull: false,
            },
            isSelfBan: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
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
                            name: "bannedUntil",
                            order: "ASC",
                        }
                    ]
                }
            ]
        });
    }
}