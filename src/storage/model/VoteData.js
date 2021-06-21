/* eslint-disable new-cap */
"use strict";
// Dependencies
let {Model, DataTypes} = require("sequelize");
let uuid = require("uuid");

class VoteData extends Model {
    /**
     * @typedef {{
     *     userId: BigInt,
     *     vote: Boolean
     * }} VoteDefinition
     * @param {BigInt} interactionId
     * @returns {Promise<VoteDefinition[]>}
     */
    static async getVotes(interactionId) {
        return (await VoteData.findAll({
            where: {
                interactionId
            }
        })).map(model => ({userId: model.userId, vote: model.vote}));
    }
    /**
     *
     * @param {BigInt} interactionId
     * @param {BigInt} userId
     * @param {boolean} vote
     */
    static async setVote(interactionId, userId, vote) {
        let data = await VoteData.findOne({
            where: {
                interactionId,
                userId
            }
        });
        if(data) {
            data.vote = vote;
            data.save();
        }
        else {
            await VoteData.create({
                interactionId,
                userId,
                vote
            });
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
    VoteData
};
