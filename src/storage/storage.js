"use strict";
// Core Modules
let path = require("path");

// Dependencies
let { Sequelize } = require("sequelize");
let AdditionalMessageData = require("./model/AdditionalMessageData");
let { WoispingVoteData, WoispingReasonData } = require("./model/WoispingData");
let { VoteData } = require("./model/VoteData");

// Models
let FadingMessage = require("./model/FadingMessage");
const { BanData } = require("./model/BanData");
const GuildRagequit = require("./model/GuildRagequit");

exports.initialize = async function () {
    let sequelize = new Sequelize({
        dialect: "sqlite",
        storage: path.resolve(__dirname, "..", "..", "storage.db"),
        logging: false
    });

    FadingMessage.initialize(sequelize);
    AdditionalMessageData.initialize(sequelize);
    WoispingVoteData.initialize(sequelize);
    WoispingReasonData.initialize(sequelize);
    VoteData.initialize(sequelize);
    BanData.initialize(sequelize);
    GuildRagequit.initialize(sequelize);

    await sequelize.sync();
};
