"use strict";

// Utils
let config = require("../utils/configHandler").getConfig();

const GOOGLE_URL = "https://letmegooglethat.com/?q=";

const buildSearchQuery = function(msg) {
    return GOOGLE_URL + encodeURIComponent(msg);
};

exports.run = async(client, message, args, callback) => {
    const messageRef = message.reference?.messageID;
    const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}lmgtfy `.length);
    let reply = "";
    if (!args.length && !messageRef) {
        return callback(`Bruder du bist zu dumm zum lesen? Mach \`${config.bot_settings.prefix.command_prefix}lmgtfy DEINE SUCHE HIER\` oder antworte auf eine Nachricht`);
    }
    // If reply to message
    if (messageRef) {
        const quotedMessage = await message.channel.messages.fetch(messageRef);
        reply = `Hey, ${quotedMessage.author}, `;
        if(!text) {
            reply += `du hättest auch googeln können: ${buildSearchQuery(quotedMessage.content)}, danke dir ${message.author}`;
        }
    }

    if (text) {
        if (reply) {
            reply += `${message.author} hat es geschafft zu googeln! ${buildSearchQuery(text)}`;
        }
        else {
            reply = `${message.author} hat es geschafft zu googeln! ${buildSearchQuery(text)}`;
        }
    }
    message.channel.send(reply).then(() => message.delete());
    return callback;
};

exports.description = `Googelt nach etwas.\nBenutzung: ${config.bot_settings.prefix.command_prefix}lmgtfy [Hier deine Suche] mit oder ohne reply oder nur ${config.bot_settings.prefix.command_prefix}lmgtfy in einer reply`;
