/* Disabled due to sequelize's DataTypes */

import type { User, GuildMember } from "discord.js";
import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";

import log from "../../utils/logger.js";

export interface BanAttributes {
    id: string;
    userId: string;
    reason: string | null;
    bannedUntil: Date | null;
    isSelfBan: boolean;
}

export type BanCreationAttributes = Optional<BanAttributes, "id">;

export default class Ban
    extends Model<BanAttributes, BanCreationAttributes>
    implements BanAttributes
{
    declare id: string;
    declare userId: string;
    declare reason: string | null;
    declare bannedUntil: Date | null;
    declare isSelfBan: boolean;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static persistOrUpdate = async (
        user: GuildMember,
        until: Date | null,
        isSelfBan: boolean,
        reason: string | null = null,
    ): Promise<void> => {
        log.debug(
            `Saving Ban for user ${user} until ${until} (Selfban: ${isSelfBan}, Reason: ${reason})`,
        );
        await Ban.upsert({
            userId: user.id,
            reason,
            bannedUntil: until,
            isSelfBan,
        });
    };

    static remove = (user: User | GuildMember) =>
        Ban.destroy({ where: { userId: user.id } });

    static findExisting = (user: User | GuildMember) =>
        Ban.findOne({ where: { userId: user.id } });

    static findExpiredBans = (now: Date) =>
        Ban.findAll({
            where: {
                bannedUntil: {
                    [Op.ne]: null,
                    [Op.lte]: now,
                },
            },
        });

    static initialize(sequelize: Sequelize) {
        Ban.init(
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
                reason: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                bannedUntil: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                isSelfBan: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                },
            },
            {
                sequelize,
                indexes: [
                    {
                        unique: true,
                        fields: ["userId"],
                    },
                    {
                        using: "BTREE",
                        fields: [
                            {
                                name: "bannedUntil",
                                order: "ASC",
                            },
                        ],
                    },
                ],
            },
        );
    }
}
