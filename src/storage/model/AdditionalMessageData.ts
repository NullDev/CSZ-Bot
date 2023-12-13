import { Client, Snowflake, Message, ChannelType } from "discord.js";
import { Model, Sequelize, DataTypes } from "sequelize";

import log from "../../utils/logger.js";
import type { JsonObject } from "../../types.js";

export default class AdditionalMessageData extends Model {
    declare id: string;
    declare messageId: Snowflake;
    declare channelId: Snowflake;
    declare guildId: Snowflake;
    declare customData: JsonObject;

    /**
     * Fetches the discord message associated with this data.
     */
    async fetchMessage(client: Client): Promise<Message | undefined> {
        try {
            const guild = await client.guilds.fetch(this.guildId);
            const channel = guild.channels.cache.get(this.channelId);

            if (!channel) {
                log.error(
                    `Tried to retrieve message with id "${this.messageId}" from channel with id "${this.channelId}" from guild with id "${this.guildId}", but discord returned none. That message might be deleted or something.`,
                );
                return undefined;
            }

            if (channel.type !== ChannelType.GuildText) {
                log.error(
                    `Tried to retrieve text message from channel of type "${channel.type}". Only text channels are currently supported`,
                );
                return undefined;
            }

            return channel.messages.cache.get(this.messageId);
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(
                    err,
                    `Failed to fetch message from additional data [${JSON.stringify(
                        this,
                    )}]: ${err.message}`,
                );
            }
        }
        return undefined;
    }

    /**
     * Fetches the additional data associated with a certain message
     */
    static async fromMessage(message: Message): Promise<AdditionalMessageData> {
        if (!message.guild) {
            throw new Error(
                "Cannot associate data with message outside of a guild",
            );
        }

        const objectData = {
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: message.id,
        };

        const existingMessageData = await AdditionalMessageData.findOne({
            where: objectData,
        });
        return existingMessageData ?? AdditionalMessageData.create(objectData);
    }

    static initialize(sequelize: Sequelize) {
        AdditionalMessageData.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                messageId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                channelId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                guildId: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                customData: {
                    type: DataTypes.TEXT,
                    defaultValue: "{}",
                    get() {
                        try {
                            return JSON.parse(this.getDataValue("customData"));
                        } catch {
                            return null;
                        }
                    },
                    set(value) {
                        this.setDataValue("customData", JSON.stringify(value));
                    },
                },
            },
            {
                sequelize,
                indexes: [
                    {
                        unique: true,
                        fields: ["guildId", "channelId", "messageId"],
                    },
                ],
            },
        );
    }
}
