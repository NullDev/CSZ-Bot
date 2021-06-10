"use strict";
// Core Modules
let path = require("path");

// Dependencies
let {Sequelize} = require("sequelize");
const AdditionalMessageData = require("./model/AdditionalMessageData");

// Models
let FadingMessage = require("./model/FadingMessage");

exports.initialize = async function() {
    let sequelize = new Sequelize({
        dialect: "sqlite",
        storage: path.resolve(__dirname, "..", "..", "storage.db"),
        logging: false
    });

    FadingMessage.initialize(sequelize);
    AdditionalMessageData.initialize(sequelize);

    await sequelize.sync();
};
