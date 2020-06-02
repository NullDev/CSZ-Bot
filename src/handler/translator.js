"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let unirest = require("unirest");
/**
 * Translates the sent message
 *
 * @param {String} message
 * @param {any} callback
 */
let translator = function(message, callback){
    unirest.get(`https://api.mymemory.translated.net/get?q=${message}&langpair=en|de`)
        .then((res) => callback(null, res.body.responseData.translatedText))
        .catch((err) => callback(`TRANSLATION ERROR: ${err}`));
};

module.exports = translator;
