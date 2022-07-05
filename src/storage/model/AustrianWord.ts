/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import type { GuildMember, Snowflake } from "discord.js";
import { DataTypes, Model, Optional, Sequelize } from "sequelize";

import log from "../../utils/logger";

export interface AustrianWordAttributes {
    id: string;
    addedByUserId: string;
    austrian: string;
    german: string;
    description: string | null;
}

export interface AustrianWordCreationAttributes extends Optional<AustrianWordAttributes, "id"> { }

export default class AustrianWord extends Model {
    declare id: number;
    declare addedByUserId: Snowflake;
    declare austrian: string;
    declare german: string;
    declare description: string | null;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static persistOrUpdate = async (addedBy: GuildMember, german: string, austrian: string, description: string | null): Promise<AustrianWord> => {
        log.debug(`Saving austrian translation for user ${addedBy}. German: ${german}; Austrian: ${austrian}`);
        const result = await AustrianWord.upsert({
            addedByUserId: addedBy.id,
            austrian,
            german,
            description
        });
        return result[0];
    };

    static initialize(sequelize: Sequelize) {
        this.init({
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            german: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: false
            },
            austrian: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            }
        },
        {
            sequelize,
            modelName: "AustrianWord",
            indexes: [
                {
                    unique: true,
                    fields: ["austrian"]
                },
                {
                    unique: false,
                    fields: ["german"]
                }
            ]
        });
    }
}
