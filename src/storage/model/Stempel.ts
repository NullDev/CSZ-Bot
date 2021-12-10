/* Disabled due to sequelize's DataTypes */
/* eslint-disable new-cap */

import type { Snowflake } from "discord.js";
import { Sequelize, Model, DataTypes, Optional } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export interface StempelAttributes {
    id: string;
    invitator: Snowflake;
    invitedMember: Snowflake;
}

export interface StempelCreationAttributes extends Optional<StempelAttributes, "id"> { }

export default class Stempel extends Model<StempelAttributes, StempelCreationAttributes> implements StempelAttributes {
    id!: string;
    invitator!: Snowflake;
    invitedMember!: Snowflake;

    /**
     * @returns true/false depending if the invitedMember is already in the database
     */
    static async insertStempel(invitator: Snowflake, invitedMember: Snowflake): Promise<boolean> {
        try {
            await Stempel.create({
                invitator,
                invitedMember
            });
            return true;
        }
        catch {
            return false;
        }
    }

    /**
     * @param {Snowflake} invitator Snowflake ID of the inviter.
     */
    static getStempelByInvitator(invitator: Snowflake) {
        return Stempel.findAll({
            where: {
                invitator
            }
        });
    }

    static initialize(sequelize: Sequelize) {
        this.init({
            id: {
                type: DataTypes.STRING(36),
                defaultValue: () => uuidv4(),
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
