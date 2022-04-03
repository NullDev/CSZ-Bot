/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import type { Snowflake } from "discord.js";
import { Model, DataTypes, type Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export default class GuildRagequit extends Model {
    declare id: string;
    declare guildId: Snowflake;
    declare userId: Snowflake;
    declare numRagequits: number;

    static async getNumRagequits(guildId: Snowflake, userId: Snowflake) {
        const data = await GuildRagequit.findOne({
            where: {
                guildId,
                userId
            }
        });

        return data?.numRagequits ?? 0;
    }

    /**
     *
     * @param {BigInt} guildId
     * @param {BigInt} userId
     */
    static async incrementRagequit(guildId: Snowflake, userId: Snowflake) {
        const data = await GuildRagequit.findOne({
            where: {
                guildId,
                userId
            }
        });

        if (!data) {
            await GuildRagequit.create({
                guildId,
                userId,
                numRagequits: 1
            });
            return;
        }

        data.numRagequits += 1;
        await data.save();
    }

    static initialize(sequelize: Sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuidv4(),
                primaryKey: true
            },
            guildId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            userId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            numRagequits: {
                type: DataTypes.INTEGER(),
                defaultValue: 0,
                allowNull: false
            }
        }, {
            sequelize,
            indexes: [
                {
                    unique: true,
                    fields: ["guildId", "userId"]
                }
            ]
        });
    }
}
