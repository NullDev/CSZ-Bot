import { Sequelize } from "sequelize";

import log from "../utils/logger.js";
import Reminder from "./model/Reminder.js";

export async function initialize(databasePath: string) {
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: databasePath,
        logQueryParameters: true,
        logging: sql => log.trace(sql),
    });

    log.info("Initializing Database Schemas...");

    Reminder.initialize(sequelize);
    await sequelize.sync();
}
