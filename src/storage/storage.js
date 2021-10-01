import * as path from "path";

import { Sequelize } from "sequelize";

import AdditionalMessageData from "./model/AdditionalMessageData";
import FadingMessage from "./model/FadingMessage";
import GuildRagequit from "./model/GuildRagequit";

export async function initialize() {
    let sequelize = new Sequelize({
        dialect: "sqlite",
        storage: path.resolve(__dirname, "..", "..", "storage.db"),
        logging: false
    });

    FadingMessage.initialize(sequelize);
    AdditionalMessageData.initialize(sequelize);
    GuildRagequit.initialize(sequelize);

    await sequelize.sync();
}
