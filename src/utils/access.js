"use strict";

const config = require("./configHandler").getConfig();

const modRoles = config.bot_settings.moderator_roles;

const isModeratorMessage = (message) => message.member.roles.cache.some(r => modRoles.includes(r.name));

const isModeratorUser = (user) => user.roles.cache.some(r => modRoles.includes(r.name));

module.exports = {
    isModeratorMessage,
    isModeratorUser
};
