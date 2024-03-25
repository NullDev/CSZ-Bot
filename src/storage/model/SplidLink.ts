import { Model, DataTypes, type Sequelize, type Optional, Op } from "sequelize";
import type { Guild, Snowflake, User } from "discord.js";

export interface SplidLinkAttributes {
    id: string;

    /**
     * We scope the link to the guild for privacy reasons.
     * This way, the user can link himself in a guild an still be anonymous in a different guild.
     */
    guildId: string;
    discordUserId: Snowflake;
    externalSplidId: string;
}

export type SplidLinkCreationAttributes = Optional<SplidLinkAttributes, "id">;

export default class SplidLink
    extends Model<SplidLinkAttributes, SplidLinkCreationAttributes>
    implements SplidLinkAttributes
{
    declare id: string;
    declare guildId: string;
    declare discordUserId: Snowflake;
    declare externalSplidId: string;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initialize(sequelize: Sequelize) {
        SplidLink.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                guildId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                discordUserId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                externalSplidId: {
                    type: DataTypes.STRING(420),
                    allowNull: false,
                },
            },
            {
                sequelize,
                indexes: [
                    {
                        fields: ["externalSplidId", "discordUserId"],
                    },
                    {
                        unique: true,
                        fields: ["guildId", "discordUserId", "externalSplidId"],
                    },
                ],
            },
        );
    }
}
