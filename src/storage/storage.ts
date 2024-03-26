import { Sequelize } from "sequelize";

import log from "../utils/logger.js";

export async function initialize(databasePath: string) {
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: databasePath,
        logQueryParameters: true,
        logging: sql => log.trace(sql),
    });

    log.info("Initializing Database Schemas...");

    await sequelize.sync();
}
