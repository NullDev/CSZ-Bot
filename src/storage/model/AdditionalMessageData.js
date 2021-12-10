/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import { Model, DataTypes } from "sequelize";
import { v4 as uuidv4 } from "uuid";

import * as log from "../../utils/logger";

export default class AdditionalMessageData extends Model {
    /**
     * Fetches the discord message associated with this data
     * @param {import("discord.js").Client} client
     */
    async fetchMessage(client) {
        try {
            return (await client.guilds.fetch(this.guildId))
                .channels.cache.get(this.channelId)
                .messages.cache.get(message.id);
        }
        catch(err) {
            log.error(`Failed to fetch message from additional data [${JSON.stringify(this)}]: ${err.message}`);
        }
        return null;
    }

    /**
     * Fetches the additional data associated with a certain message
     * @param {import("discord.js").Message} message
     */
    static async fromMessage(message) {
        let objectData = {
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: message.id
        };

        let data = await AdditionalMessageData.findOne({where: objectData});

        if(!data) {
            data = await AdditionalMessageData.create(objectData);
        }

        return data;
    }

    static initialize(sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuidv4(),
                primaryKey: true
            },
            messageId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            channelId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            guildId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            customData: {
                type: DataTypes.TEXT,
                defaultValue: "{}",
                get() {
                    try {
                        return JSON.parse(this.getDataValue("customData"));
                    }
                    catch {
                        return null;
                    }
                },
                set(value) {
                    this.setDataValue("customData", JSON.stringify(value));
                }
            }
        }, {
            sequelize,
            indexes: [
                {
                    unique: true,
                    fields: ["guildId", "channelId", "messageId"]
                }
            ]
        });
    }
}
