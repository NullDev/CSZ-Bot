"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let unirest = require("unirest");
let DetectLanguage = require("detectlanguage");

// Utils
let config = require("../utils/configHandler").getConfig();
let log = require("../utils/logger");

let detectLanguage = new DetectLanguage({
    key: config.auth.language_detection_api_key,
    ssl: true
});

/**
 * Translates the sent message
 *
 * @param {String} message
 * @param {any} callback
 */
let translator = function(message, callback){
    // @ts-ignore
    // eslint-disable-next-line consistent-return
    detectLanguage.detect(message, (error, result) => {
        if (error) return log.error(error);
        if (result[0].language !== "en") return callback();

        unirest.get(`https://api.mymemory.translated.net/get?q=${message}&de=${config.bot_settings.owner_email}&langpair=en|de`)
            .then((res) => callback(null, res.body.responseData.translatedText))
            .catch((err) => callback(`TRANSLATION ERROR: ${err}`));
    });
};

module.exports = translator;
