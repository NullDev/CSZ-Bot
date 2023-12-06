import type { GuildMember, Snowflake } from "discord.js";
import { DataTypes, Model, Op, Optional, Sequelize } from "sequelize";

import log from "../../utils/logger.js";

export interface AustrianTranslationAttributes {
    id: string;
    addedByUserId: string;
    austrian: string;
    german: string;
    description: string | null;
}

export type AustrianTranslationCreationAttributes = Optional<
    AustrianTranslationAttributes,
    "id"
>;

export default class AustrianTranslation extends Model {
    declare id: number;
    declare addedByUserId: Snowflake;
    declare austrian: string;
    declare german: string;
    declare description: string | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static persistOrUpdate = async (
        addedBy: GuildMember,
        german: string,
        austrian: string,
        description: string | null,
    ): Promise<AustrianTranslation> => {
        log.debug(
            `Saving austrian translation for user ${addedBy}. German: ${german}; Austrian: ${austrian}`,
        );
        const result = await AustrianTranslation.upsert({
            addedByUserId: addedBy.id,
            austrian,
            german,
            description,
        });
        return result[0];
    };

    static findTranslation(
        austrian: string,
    ): Promise<AustrianTranslation | null> {
        return AustrianTranslation.findOne({
            where: {
                austrian: {
                    // we want like to be case-insensitive, we don't need a placeholder
                    [Op.like]: austrian.trim().toLowerCase(),
                },
            },
        });
    }

    static initialize(sequelize: Sequelize) {
        AustrianTranslation.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                german: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: false,
                },
                austrian: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
            },
            {
                sequelize,
                modelName: "AustrianTranslation",
                indexes: [
                    {
                        unique: true,
                        fields: ["austrian"],
                    },
                    {
                        unique: false,
                        fields: ["german"],
                    },
                ],
            },
        );
    }
}
