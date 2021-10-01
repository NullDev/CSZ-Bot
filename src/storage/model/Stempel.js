"use strict";

let { Model, DataTypes, json } = require("sequelize");
let uuid = require("uuid");

class Stempel extends Model {
    /**
     *
     * @param {BigInt} inviter
     * @param {BigInt} invited
     * @param {String} date
     * @returns true/false depending if the invited person is already in the database
     */
    static async insertStempel(inviter, invited, date) {
        let newItem = "";
        await Stempel.findOrCreate({
            where: {
                invited: invited
            },
            defaults: {
                inviter,
                invited,
                date
            }
        }).then((item, created) => {
            newItem = item.toString().split(",")[1];
        });

        return newItem;
    }

    static async getStempelByInviter(inviter) {
        return await Stempel.findAll({
            where: {
                inviter: inviter
            }
        });
    }

    static initialize(sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuid.v4(),
                primaryKey: true
            },
            inviter: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            invited: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },
            date: {
                type: DataTypes.STRING,
                allowNull: false
            }
        }, {
            sequelize,
            modelName: "Stempel"
        });
    }
}

module.exports = Stempel;
