import { Sequelize } from "sequelize";

import AdditionalMessageData from "./model/AdditionalMessageData.js";
import FadingMessage from "./model/FadingMessage.js";
import Ban from "./model/Ban.js";
import log from "../utils/logger.js";
import Reminder from "./model/Reminder.js";
import AustrianTranslation from "./model/AustrianTranslation.js";
import { EhrePoints, EhreVotes } from "./model/Ehre.js";
import WoisAction from "./model/WoisAction.js";

export async function initialize(databasePath: string) {
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: databasePath,
        logQueryParameters: true,
        logging: sql => {
            // currently way too noisy because of the fading messages
            if (!sql.includes(FadingMessage.tableName)) {
                log.trace(sql);
            }
        },
    });

    log.info("Initializing Database Schemas...");

    FadingMessage.initialize(sequelize);
    AdditionalMessageData.initialize(sequelize);
    Ban.initialize(sequelize);
    Reminder.initialize(sequelize);
    AustrianTranslation.initialize(sequelize);
    EhrePoints.initialize(sequelize);
    EhreVotes.initialize(sequelize);
    WoisAction.initialize(sequelize);
    await sequelize.sync();
}
