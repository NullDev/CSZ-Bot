/* eslint-disable new-cap */
"use strict";
// Dependencies
let {Model, DataTypes} = require("sequelize");
let uuid = require("uuid");

class GuildRagequit extends Model {
    /**
     *
     * @param {BigInt} guildId
     * @param {BigInt} userId
     * @returns {Promise<number>}
     */
    static async getNumRagequits(guildId, userId) {
        let data = await GuildRagequit.findOne({
            where: {
                guildId,
                userId
            }
        });

        return data ? data.numRagequits : 0;
    }

    /**
     *
     * @param {BigInt} guildId
     * @param {BigInt} userId
     */
    static async incrementRagequit(guildId, userId) {
        let data = await GuildRagequit.findOne({
            where: {
                guildId,
                userId
            }
        });

        if(!data) {
            data = await GuildRagequit.create({
                guildId,
                userId,
                numRagequits: 1
            });
        }
        else {
            data.numRagequits += 1;
            await data.save();
        }
    }

    static initialize(sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuid.v4(),
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

module.exports = GuildRagequit;
