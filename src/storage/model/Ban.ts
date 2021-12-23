/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import type { User, GuildMember } from "discord.js";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import * as log from "../../utils/logger";

export interface BanAttributes {
    id: string;
    userId: string;
    reason: string | null;
    bannedUntil: Date | null;
    isSelfBan: boolean;
}

export interface BanCreationAttributes extends Optional<BanAttributes, "id"> { }

export default class Ban extends Model<BanAttributes, BanCreationAttributes> implements BanAttributes {
    id!: string;
    userId!: string;
    reason!: string | null;
    bannedUntil!: Date | null;
    isSelfBan!: boolean;

    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    static persistOrUpdate = (user: GuildMember, until: Date | null, isSelfBan: boolean, reason: string | null = null): Promise<void> => {
        log.debug(`Saving Ban for user ${user} until ${until} (Selfban: ${isSelfBan}, Reason: ${reason})`);
        return Ban.upsert({
            userId: user.id,
            reason,
            bannedUntil: until,
            isSelfBan
        }) as Promise<any>;
    };

    static remove = (user: User) => Ban.destroy({ where: { userId: user.id } });

    static findExisting = (user: User) => Ban.findOne({ where: { userId: user.id } });

    static findExpiredBans = (now: Date) => Ban.findAll({
        where: {
            bannedUntil: {
                [Op.ne]: null,
                [Op.lte]: now
            }
        }
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
                type: DataTypes.DATE,
                allowNull: true
            },
            isSelfBan: {
                type: DataTypes.BOOLEAN,
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
                            name: "bannedUntil",
                            order: "ASC"
                        }
                    ]
                }
            ]
        });
    }
}
