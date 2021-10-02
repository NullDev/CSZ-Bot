/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

let { Model, DataTypes } = require("sequelize");
let uuid = require("uuid");

class Stempel extends Model {
    /**
     *
     * @param {import("discord.js").Snowflake} invitator
     * @param {import("discord.js").Snowflake} invitedMember
     * @returns true/false depending if the invitedMember is already in the database
     */
    static async insertStempel(invitator, invitedMember) {
        let isNewItem = false;
        await Stempel.create({
            invitator,
            invitedMember
        }).then(() => {
            isNewItem = true;
        }).catch(() => {
            isNewItem = false;
        });

        return isNewItem;
    }

    static async getStempelByInvitator(invitator) {
        return await Stempel.findAll({
            where: {
                invitator
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
            invitator: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            invitedMember: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true
            }
        },
        {
            sequelize,
            modelName: "Stempel"
        });
    }
}

module.exports = Stempel;
