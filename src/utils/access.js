"use strict";

const config = require("./configHandler").getConfig();

const isModeratorMessage = (message) => {
    const modRoles = config.bot_settings.moderator_roles;
    return message.member.roles.cache.some(r => modRoles.includes(r.name));
};

const isModeratorUser = (user) => {
    const modRoles = config.bot_settings.moderator_roles;
    return user.roles.cache.some(r => modRoles.includes(r.name));
};

module.exports = {
    isModeratorMessage,
    isModeratorUser
};
