/* Disabled due to sequelize's DataTypes */

import { Sequelize, Model, DataTypes, Optional } from "sequelize";
import type { Snowflake } from "discord.js";

import log from "../../utils/logger.js";

export interface StempelAttributes {
    id: string;
    invitator: Snowflake;
    invitedMember: Snowflake;
}

export type StempelCreationAttributes = Optional<StempelAttributes, "id">;

export default class Stempel
    extends Model<StempelAttributes, StempelCreationAttributes>
    implements StempelAttributes
{
    declare id: string;
    declare invitator: Snowflake;
    declare invitedMember: Snowflake;

    /**
     * @returns true/false depending if the invitedMember is already in the database
     */
    static async insertStempel(
        invitator: Snowflake,
        invitedMember: Snowflake,
    ): Promise<boolean> {
        log.debug(
            `Inserting Stempel into Database with ${invitator} invitator and ${invitedMember} as invited member`,
        );
        try {
            await Stempel.create({
                invitator,
                invitedMember,
            });
            return true;
        } catch {
            log.debug("Stempel does already exist");
            return false;
        }
    }

    /**
     * @param {Snowflake} invitator Snowflake ID of the inviter.
     */
    static getStempelByInvitator(invitator: Snowflake) {
        return Stempel.findAll({
            where: {
                invitator,
            },
        });
    }

    static initialize(sequelize: Sequelize) {
        this.init(
            {
                id: {
                    type: DataTypes.STRING(36),
                    defaultValue: () => crypto.randomUUID(),
                    primaryKey: true,
                },
                invitator: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                },
                invitedMember: {
                    type: DataTypes.STRING(32),
                    allowNull: false,
                    unique: true,
                },
            },
            {
                sequelize,
                modelName: "Stempel",
            },
        );
    }
}
