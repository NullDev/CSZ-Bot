import { Snowflake } from "discord.js";
import { Model, DataTypes, Sequelize } from "sequelize";

interface BanAttributes {
	userId: string;
	unbanAt: number;
}

export class BanData extends Model<BanAttributes> implements BanAttributes {
	public userId: string = "";
	public unbanAt: number = 0;

    static async getUnbanAt(userId: Snowflake): Promise<number | undefined> {
		const data = await BanData.findByPk(userId);
		return data?.unbanAt;
    }

    static async getBans(): Promise<BanData[]> {
        return await BanData.findAll();
    }

    static async removeBan(userId: Snowflake): Promise<void> {
		await BanData.destroy({
			where: {
				userId
			}
		})
    }

    static async setBan(userId: Snowflake, unbanAt: number): Promise<void> {
		await BanData.upsert({
			userId,
			unbanAt
		});

		/*
        const data = await BanData.findOne({
            where: {
                userId
            }
        });

        if (data) {
            data.unbanAt = unbanAt;
            data.save();
        }
        else {
            await BanData.create({
                userId,
                unbanAt
            });
        }
		*/
    }

    static initialize(sequelize: Sequelize) {
        this.init({
            userId: {
                type: DataTypes.STRING(32),
                allowNull: false,
                primaryKey: true
            },
            unbanAt: {
                type: DataTypes.BIGINT(),
                allowNull: false
            }
        }, {
            sequelize,
            indexes: [
                {
                    unique: true,
                    fields: ["userId"]
                }
            ]
        });
    }
}