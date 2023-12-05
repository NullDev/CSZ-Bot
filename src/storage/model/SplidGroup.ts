/* Disabled due to sequelize's DataTypes */

import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import type { Guild, Snowflake, User } from "discord.js";

import log from "../../utils/logger.js";

export interface SplidGroupAttributes {
    id: string;
    creatorId: string;
    guildId: string;
    groupCode: string;
    // TODO: Seems to be client specific:
    // externalSplidGroupId: string;
    shortDescription: string;
    longDescription: string | null;
}

export type SplidGroupCreationAttributes = Optional<SplidGroupAttributes, "id">;

export default class SplidGroup
    extends Model<SplidGroupAttributes, SplidGroupCreationAttributes>
    implements SplidGroupAttributes
{
    declare id: string;
    declare creatorId: Snowflake;
    declare guildId: Snowflake;
    declare groupCode: string;
    // TODO: Seems to be client specific:
    // declare externalSplidGroupId: string;
    declare shortDescription: string;
    declare longDescription: string | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static createSplidGroup = (
        creator: User,
        guild: Guild,
        groupCode: string,
        externalSplidGroupId: string,
        shortDescription: string,
        longDescription: string | null,
    ): Promise<SplidGroupAttributes> => {
        log.debug(
            `Saving splid group, initiated by ${creator} on guild ${guild} with group code ${groupCode}: "${shortDescription}"`,
        );
        return SplidGroup.create({
            creatorId: creator.id,
            guildId: guild.id,
            groupCode,
            // externalSplidGroupId,
            shortDescription,
            longDescription,
        });
    };

    static findAllGroups(guild: Guild): Promise<SplidGroup[]> {
        return SplidGroup.findAll({
            where: {
                guildId: guild.id,
            },
        });
    }

    static findOneByCodeForGuild(
        guild: Guild,
        groupCode: string,
    ): Promise<SplidGroup | null> {
        return SplidGroup.findOne({
            where: {
                guildId: guild.id,
                groupCode,
            },
        });
    }

    static findOneByDescriptionForGuild(
        guild: Guild,
        shortDescription: string,
    ): Promise<SplidGroup | null> {
        return SplidGroup.findOne({
            where: {
                guildId: guild.id,
                shortDescription,
            },
        });
    }

    static async deleteByInviteCode(groupCode: string): Promise<void> {
        await SplidGroup.destroy({
            where: {
                groupCode,
            },
        });
    }

    static initialize(sequelize: Sequelize) {
        SplidGroup.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                creatorId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                guildId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                groupCode: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                // TODO: Seems to be client specific:
                // externalSplidGroupId: {
                //     type: DataTypes.STRING(32),
                //     allowNull: false,
                // },
                shortDescription: {
                    type: DataTypes.STRING(69),
                    allowNull: false,
                },
                longDescription: {
                    type: DataTypes.STRING(1000),
                    allowNull: true,
                },
            },
            {
                sequelize,
                indexes: [
                    {
                        fields: ["guildId"],
                    },
                    {
                        unique: true,
                        fields: ["shortDescription"],
                    },
                    {
                        unique: true,
                        fields: ["externalSplidGroupId", "guildId"],
                    },
                    {
                        unique: true,
                        fields: ["groupCode", "guildId"],
                    },
                ],
            },
        );
    }
}
