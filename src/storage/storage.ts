import { Sequelize } from "sequelize";

import AdditionalMessageData from "./model/AdditionalMessageData.js";
import Ban from "./model/Ban.js";
import log from "../utils/logger.js";
import Reminder from "./model/Reminder.js";
import WoisAction from "./model/WoisAction.js";

export async function initialize(databasePath: string) {
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: databasePath,
        logQueryParameters: true,
        logging: sql => log.trace(sql),
    });

    log.info("Initializing Database Schemas...");

    AdditionalMessageData.initialize(sequelize);
    Ban.initialize(sequelize);
    Reminder.initialize(sequelize);
    WoisAction.initialize(sequelize);
    await sequelize.sync();
}
