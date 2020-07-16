"use strict";

// Dependencies
let moment = require("moment"); //MOMENT MAL

// Utils
let config = require("../utils/configHandler").getConfig();

/**
 * Creates a mocking spongebob text
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    if (!args.length) return callback("Bruder du bist zu dumm zum mocken");

    var res = "<@${message.author.id}>:";
    var next = Math.floor(Math.random() * 3) + 1;
    for(var i = 0; i < text.length; ++i) {
      if(i === next) {
	      res += text.charAt(i).toUpperCase();
	      next += Math.floor(Math.random() * 3) + 1; 
	    } else {
	      res += text.charAt(i);
	    }
    }
    
    return callback(res);
};

exports.description = `Mockt dein Gedöns.\nBenutzung: ${config.bot_settings.prefix.command_prefix}mock [Hier dein Text]`;
