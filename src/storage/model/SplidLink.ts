import { Model, DataTypes, Sequelize, Optional, Op } from "sequelize";
import type { Guild, Snowflake, User } from "discord.js";

import log from "../../utils/logger.js";

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

    static createLink = (
        guild: Guild,
        user: User,
        externalSplidId: string,
    ): Promise<SplidLinkAttributes> => {
        log.debug(
            `Linking splid UUID "${externalSplidId}" with discord user ${user} on guild ${guild}`,
        );
        return SplidLink.create({
            guildId: guild.id,
            discordUserId: user.id,
            externalSplidId,
        });
    };

    static async matchUsers(
        guild: Guild,
        splidIds: Set<string>,
    ): Promise<Map<string, Snowflake>> {
        const availableLinks = await SplidLink.findAll({
            where: {
                guildId: guild.id,
                externalSplidId: {
                    [Op.in]: [...splidIds],
                },
            },
        });

        const result = new Map<string, Snowflake>();
        for (const splidId of splidIds) {
            const link = availableLinks.find(
                link => link.externalSplidId === splidId,
            );
            if (link) {
                result.set(splidId, link.discordUserId);
            }
        }

        return result;
    }

    static async delete(guild: Guild, user: User): Promise<void> {
        await SplidLink.destroy({
            where: {
                guildId: guild.id,
                discordUserId: user.id,
            },
        });
    }

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
