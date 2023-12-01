/* Disabled due to sequelize's DataTypes */

import { Model, DataTypes, type Sequelize } from "sequelize";
import type { Snowflake } from "discord.js";

import type { ProcessableMessage } from "../../handler/cmdHandler.js";

export default class FadingMessage extends Model {
    declare id: string;
    declare messageId: Snowflake;
    declare channelId: Snowflake;
    declare guildId: Snowflake;
    declare beginTime: Date;
    declare endTime: Date;

    /**
     * Starts a fading message object
     * @param {import("discord.js").Message} message
     * @param {Number} deleteInMs The time in milliseconds when the message should be deleted
     * @returns {Promise<this>}
     */
    startFadingMessage(message: ProcessableMessage, deleteInMs: number) {
        this.beginTime = this.beginTime || new Date();
        this.endTime =
            this.endTime || new Date(this.beginTime.valueOf() + deleteInMs);
        this.messageId = message.id;
        this.channelId = message.channel.id;
        this.guildId = message.guild.id;
        return this.save();
    }

    /**
     * Starts a fading message object
     * @param {import("discord.js").Message} message
     * @param {number} deleteInMs The time in milliseconds when the message should be deleted
     * @returns {Promise<this>}
     */
    static async newFadingMessage(
        message: ProcessableMessage,
        deleteInMs: number,
    ) {
        const fadingMessage = await FadingMessage.create();
        await fadingMessage.startFadingMessage(message, deleteInMs);
    }

    static initialize(sequelize: Sequelize) {
        FadingMessage.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                messageId: {
                    type: DataTypes.STRING(32), // Brudi discord nimmt hier einfach die Unix Time MS, was ist mit denen eigentlich
                    allowNull: true,
                },
                channelId: {
                    type: DataTypes.STRING(32),
                    allowNull: true,
                },
                guildId: {
                    type: DataTypes.STRING(32),
                    allowNull: true,
                },
                beginTime: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                endTime: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            { sequelize },
        );
    }
}
