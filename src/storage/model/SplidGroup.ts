/* Disabled due to sequelize's DataTypes */

import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import type { Snowflake, User } from "discord.js";

import log from "../../utils/logger.js";

export interface SplidGroupAttributes {
    id: string;
    creatorId: string;
    guildId: string;
    groupCode: string;
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
    declare shortDescription: string;
    declare longDescription: string | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static createSplidGroup = (
        creator: User,
        guildId: string,
        groupCode: string,
        shortDescription: string,
        longDescription: string | null,
    ): Promise<SplidGroupAttributes> => {
        log.debug(
            `Saving splid group, initiated by ${creator.id} on guild ${guildId} with group code ${groupCode}: "${shortDescription}"`,
        );
        return SplidGroup.create({
            creatorId: creator.id,
            guildId,
            groupCode,
            shortDescription,
            longDescription,
        });
    };

    static findAllGroups(guildId: Snowflake): Promise<SplidGroup[]> {
        return SplidGroup.findAll({
            where: {
                guildId,
            },
        });
    }

    static async delete(id: string): Promise<void> {
        await SplidGroup.destroy({
            where: {
                id,
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
                shortDescription: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                longDescription: {
                    type: DataTypes.STRING(1024),
                    allowNull: false,
                },
            },
            {
                sequelize,
                indexes: [
                    {
                        fields: [
                            {
                                name: "guildId",
                            },
                        ],
                    },
                    {
                        unique: true,
                        fields: [
                            {
                                name: "groupCode",
                            },
                        ],
                    },
                ],
            },
        );
    }
}
