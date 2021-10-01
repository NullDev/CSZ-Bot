"use strict";

// Utils
let config = require("../utils/configHandler").getConfig();

const GOOGLE_URL = "https://letmegooglethat.com/?q=";

const buildSearchQuery = function(msg) {
    return GOOGLE_URL + encodeURIComponent(msg);
};

exports.run = async(client, message, callback) => {
    const messageRef = message.reference?.messageID;
    const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}lmgtfy `.length);
    let reply;
    if (!text.length && !messageRef) {
        return callback(`Bruder du bist zu dumm zum lesen? Mach \`${config.bot_settings.prefix.command_prefix}lmgtfy DEINE SUCHE HIER\` oder antworte auf eine Nachricht`);
    }
    // If reply to message
    if (messageRef) {
        const quotedMessage = await client.channels.cache.get(channel).messages.fetch(messageRef);
        reply = `Hey, ${quotedMessage.author}, `;
        if(!text.length) {
            reply += `du hättest auch googeln können: ${buildSearchQuery(quotedMessage.content)}, danke dir ${message.author}`;
        }
    }

    if (text) {
        reply += `${message.author} hat es geschafft zu googeln! ${buildSearchQuery()}`;
    }
    message.channel.reply(reply).then(() => message.delete());
    return callback();
};

exports.description = `Googelt nach etwas.\nBenutzung: ${config.bot_settings.prefix.command_prefix}lmgtfy [Hier deine Suche] mit oder ohne reply oder nur ${config.bot_settings.prefix.command_prefix}lmgtfy in einer reply`;
