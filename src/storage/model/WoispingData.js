/* eslint-disable new-cap */
"use strict";
// Dependencies
let {Model, DataTypes} = require("sequelize");
let uuid = require("uuid");

class WoispingReasonData extends Model {
    /**
     *
     * @param {BigInt} interactionId
     * @param {string} reason
     */
    static async setReason(interactionId, reason) {
        await WoispingReasonData.create({
            interactionId,
            reason
        });
    }

    /**
     *
     * @param {BigInt} interactionId
     * @returns {string}
     */
    static async getReason(interactionId) {
        let data = await WoispingReasonData.findOne({
            where: {
                interactionId
            }
        });
        if(data) {
            return data.reason;
        }
        return null;
    }

    static initialize(sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuid.v4(),
                primaryKey: true
            },
            interactionId: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true
            },
            reason: {
                type: DataTypes.STRING(256),
                allowNull: false
            }
        }, {
            sequelize,
            indexes: [
                {
                    unique: true,
                    fields: ["interactionId", "reason"]
                }
            ]
        });
    }
}

class WoispingVoteData extends Model {
    /**
     *
     * @param {BigInt} interactionId
     * @returns {number}
     */
    static async getNumOfYesVotes(interactionId) {
        return (await WoispingVoteData.findAndCountAll({
            where: {
                interactionId,
                vote: true
            }
        })).count;
    }

    /**
     *
     * @param {BigInt} interactionId
     * @param {BigInt} userId
     * @param {Boolean} vote
     */
    static async setVote(interactionId, userId, vote) {
        let data = await WoispingVoteData.findOne({
            where: {
                interactionId,
                userId
            }
        });

        if(!data) {
            data = await WoispingVoteData.create({
                interactionId,
                userId,
                vote
            });
        }
        else {
            data.vote = vote;
            data.save();
        }
    }

    static initialize(sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuid.v4(),
                primaryKey: true
            },
            interactionId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            userId: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            vote: {
                type: DataTypes.BOOLEAN,
                allowNull: false
            }
        }, {
            sequelize,
            indexes: [
                {
                    unique: true,
                    fields: ["interactionId", "userId"]
                },
                {
                    unique: true,
                    fields: ["interactionId", "userId", "vote"]
                }
            ]
        });
    }
}

module.exports = {
    WoispingVoteData,
    WoispingReasonData
};
