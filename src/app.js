"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let Discord = require("discord.js");
let cron = require("node-cron");

// Utils
let conf = require("./utils/configHandler");
let log = require("./utils/logger");

// Handler
let messageHandler = require("./handler/messageHandler");
let reactionHandler = require("./handler/reactionHandler");
let BdayHandler = require("./handler/bdayHandler");

// Other commands
let ban = require("./commands/modcommands/ban");
let poll = require("./commands/poll");

let version = conf.getVersion();
let appname = conf.getName();
let devname = conf.getAuthor();

let splashPadding = 12 + appname.length + version.toString().length;

console.log(
    `\n #${"-".repeat(splashPadding)}#\n` +
    ` # Started ${appname} v${version} #\n` +
    ` #${"-".repeat(splashPadding)}#\n\n` +
    ` Copyright (c) ${(new Date()).getFullYear()} ${devname}\n`
);

log.done("Started.");

const config = conf.getConfig();
const client = new Discord.Client();

process.on("unhandledRejection", (err, promise) => log.error(`Unhandled rejection (promise: ${promise}, reason: ${err})`));

let firstRun = true;
client.on("ready", () => {
    log.info("Running...");
    log.info(`Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`);
    client.user.setActivity(config.bot_settings.status);

    const bday = new BdayHandler(client);
    if (firstRun){
        firstRun = false; // Hacky deadlock ...
        cron.schedule("37 13 * * *", () => {
            // @ts-ignore
            client.guilds.cache.get(config.ids.guild_id).channels.cache.get(config.ids.hauptchat_id).send(
                "Es ist `13:37` meine Kerle.\nBleibt hydriert! :grin: :sweat_drops:"
            );
        });

        cron.schedule("1 0 * * *", () => bday.checkBdays());
        bday.checkBdays();
    }

    ban.loadBans();
    ban.startCron(client);

    poll.startCron(client);
});

client.on("guildCreate", guild => log.info(`New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`));

client.on("guildDelete", guild => log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`));

client.on("message", (message) => messageHandler(message, client));

client.on("error", log.error);

client.on("raw", async event => reactionHandler(event, client));

client.login(config.auth.bot_token).then(() => {
    log.done("Token login was successful!");
}, (err) => {
    log.error(`Token login was not successful: "${err}"`);
    log.error("Shutting down due to incorrect token...\n\n");
    process.exit(1);
});
