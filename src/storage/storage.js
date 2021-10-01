"use strict";
// Core Modules
let path = require("path");

// Dependencies
let {Sequelize} = require("sequelize");
const AdditionalMessageData = require("./model/AdditionalMessageData");

// Models
let FadingMessage = require("./model/FadingMessage");
const GuildRagequit = require("./model/GuildRagequit");
const Stempel = require("./model/Stempel");

exports.initialize = async function() {
    let sequelize = new Sequelize({
        dialect: "sqlite",
        storage: path.resolve(__dirname, "..", "..", "storage.db"),
        logging: false
    });

    FadingMessage.initialize(sequelize);
    AdditionalMessageData.initialize(sequelize);
    GuildRagequit.initialize(sequelize);
    Stempel.initialize(sequelize);

    await sequelize.sync();
};
