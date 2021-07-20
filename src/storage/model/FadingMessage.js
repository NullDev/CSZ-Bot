/* eslint-disable new-cap */
"use strict";
// Dependencies
let { Model, DataTypes } = require("sequelize");
let uuid = require("uuid");

class FadingMessage extends Model {
    /**
     * Starts a fading message object
     * @param {import("discord.js").Message} message
     * @param {Number} deleteInMs The time in milliseconds when the message should be deleted
     * @returns {Promise<this>}
     */
    startFadingMessage(message, deleteInMs) {
        this.beginTime = this.beginTime || new Date();
        this.endTime = this.endTime || new Date(this.beginTime.valueOf() + deleteInMs);
        this.messageId = message.id;
        this.channelId = message.channel.id;
        this.guildId = message.channel.guild.id;
        return this.save();
    }

    /**
     * Starts a fading message object
     * @param {import("discord.js").Message} message
     * @param {Number} deleteInMs The time in milliseconds when the message should be deleted
     * @returns {Promise<this>}
     */
    static async newFadingMessage(message, deleteInMs) {
        let fadingMessage = await FadingMessage.create();
        await fadingMessage.startFadingMessage(message, deleteInMs);
    }

    static initialize(sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuid.v4(),
                primaryKey: true
            },
            messageId: {
                type: DataTypes.STRING(32), // Brudi discord nimmt hier einfach die Unix Time MS, was ist mit denen eigentlich
                allowNull: true
            },
            channelId: {
                type: DataTypes.STRING(32),
                allowNull: true
            },
            guildId: {
                type: DataTypes.STRING(32),
                allowNull: true
            },
            beginTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            endTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            isActive: {
                type: DataTypes.VIRTUAL,
                get() {
                    let currentTime = new Date();
                    return currentTime >= beginTime && currentTime < endTime;
                },
                set() {
                    throw new Error("Can't set isActive property of FadingMessage");
                }
            },
            isFinished: {
                type: DataTypes.VIRTUAL,
                get() {
                    let currentTime = new Date();
                    return currentTime > endTime;
                },
                set() {
                    throw new Error("Can't set isFinished property of FadingMessage");
                }
            }
        }, {
            sequelize
        });
    }
}

module.exports = FadingMessage;
