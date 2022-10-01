import { Sequelize } from "sequelize";

import AdditionalMessageData from "./model/AdditionalMessageData.js";
import Birthday from "./model/Birthday.js";
import FadingMessage from "./model/FadingMessage.js";
import GuildRagequit from "./model/GuildRagequit.js";
import Stempel from "./model/Stempel.js";
import Ban from "./model/Ban.js";
import log from "../utils/logger.js";
import Penis from "./model/Penis.js";
import Nickname from "./model/Nickname.js";
import Boob from "./model/Boob.js";
import Reminder from "./model/Reminder.js";
import AustrianTranslation from "./model/AustrianTranslation.js";
import { EhrePoints, EhreVotes } from "./model/Ehre.js";
import type { BotContext } from "../context.js";

export async function initialize(botContext: BotContext) {
    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: botContext.databasePath,
        logQueryParameters: true,
        logging: sql => {
            // currently way too noisy because of the fading messages
            if(!sql.includes(FadingMessage.tableName)) {
                log.verbose(sql);
            }
        }
    });

    log.info("Initializing Database Schemas...");

    FadingMessage.initialize(sequelize);
    AdditionalMessageData.initialize(sequelize);
    GuildRagequit.initialize(sequelize);
    Stempel.initialize(sequelize);
    Birthday.initialize(sequelize);
    Ban.initialize(sequelize);
    Penis.initialize(sequelize);
    Boob.initialize(sequelize);
    Nickname.initialize(sequelize);
    Reminder.initialize(sequelize);
    AustrianTranslation.initialize(sequelize);
    EhrePoints.initialize(sequelize);
    EhreVotes.initialize(sequelize);
    await sequelize.sync();
}
