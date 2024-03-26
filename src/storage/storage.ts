import { Sequelize } from "sequelize";

import Ban from "./model/Ban.js";
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

    Ban.initialize(sequelize);
    Reminder.initialize(sequelize);
    await sequelize.sync();
}
