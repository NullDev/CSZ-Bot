"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/** @typedef {import("discord.js").TextChannel} TC */

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
let fadingMessageHandler = require("./handler/fadingMessageHandler");
let storage = require("./storage/storage");
let command = require("./handler/commands");
let interactionHandler = require("./handler/interactionHandler");

// Other commands
let ban = require("./commands/modcommands/ban");
// let poll = require("./commands/poll");
const GuildRagequit = require("./storage/model/GuildRagequit");

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
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_INTEGRATIONS, Discord.Intents.FLAGS.GUILD_MESSAGES,  Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,  Discord.Intents.FLAGS.DIRECT_MESSAGES] });

// @ts-ignore
process.on("unhandledRejection", (err, promise) => log.error(`Unhandled rejection (promise: ${promise}, reason: ${err.stack})`));

let firstRun = true;

let allCommands = new Map();

client.on("ready", async() => {
    log.info("Running...");
    log.info(`Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`);
    client.user.setActivity(config.bot_settings.status);

    const modCommands = await command.loadModules("./built/commands/modcommands", true);
    const plebCommands = await command.loadModules("./built/commands", false);

    allCommands = new Map([...plebCommands, ...modCommands]);
    command.createApplicationCommands(client, allCommands);

    const bday = new BdayHandler(client);
    if (firstRun){
        await storage.initialize();
        firstRun = false; // Hacky deadlock ...
        let csz = client.guilds.cache.get(config.ids.guild_id);

        cron.schedule("37 13 * * *", () => {
            /** @type {TC} */
            (csz.channels.cache.get(config.ids.hauptchat_id)).send("Es ist `13:37` meine Kerle.\nBleibt hydriert! :grin: :sweat_drops:");

            // Auto-Prune members
            csz.members.prune({ days: 2, reason: "auto prune" })
                .then(count => {
                    log.info(`Auto-prune: ${count} members pruned.`);
                    if (count >= 1){
                        /** @type {TC} */
                        (csz.channels.cache.get(config.ids.hauptchat_id)).send(`Hab grad ${count} jockel weg-gepruned :joy:`);
                    }
                }).catch(e => log.error(e));
        }, {
            timezone: "Europe/Vienna"
        });

        cron.schedule("1 0 * * *", () => bday.checkBdays(), { timezone: "Europe/Vienna" });
        bday.checkBdays();
    }

    ban.startCron(client.guilds.cache.get(config.ids.guild_id));

    // await poll.importPolls();
    // poll.startCron(client);

    fadingMessageHandler.startLoop(client);
});

client.on("guildCreate", guild => log.info(`New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`));

client.on("guildDelete", guild => log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`));

client.on("guildMemberAdd", async member => {
    const numRagequits = await GuildRagequit.getNumRagequits(member.guild.id, member.id);
    if(numRagequits > 0 && !member.roles.cache.has(config.ids.shame_role_id)) {
        if(member.guild.roles.cache.has(config.ids.shame_role_id)) {
            member.roles.add(member.guild.roles.cache.get(config.ids.shame_role_id));

            const hauptchat = member.guild.channels.cache.get(config.ids.hauptchat_id);
            if(hauptchat) {
                hauptchat.send(`Haha, schau mal einer guck wer wieder hergekommen ist! <@${member.id}> hast es aber nicht lange ohne uns ausgehalten. ${numRagequits > 1 ? "Und das schon zum " + numRagequits + ". mal" : ""}`);
            }
            else {
                log.error("Hauptchat nicht gefunden");
            }
        }
        else {
            log.error("No Shame role found");
        }
    }
});

client.on("guildMemberRemove", (member) => {
    GuildRagequit.incrementRagequit(member.guild.id, member.id);
});

client.on("messageCreate", (message) => messageHandler(message, client));

client.on("messageUpdate", (_, newMessage) => messageHandler(/** @type {import("discord.js").Message} */ (newMessage), client));

client.on("error", log.error);

client.on("raw", async event => reactionHandler(event, client));

client.on("interactionCreate", async interaction => await interactionHandler.handler(interaction, allCommands));

client.login(config.auth.bot_token).then(() => {
    log.done("Token login was successful!");
}, (err) => {
    log.error(`Token login was not successful: "${err}"`);
    log.error("Shutting down due to incorrect token...\n\n");
    process.exit(1);
});
