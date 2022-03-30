// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/** @typedef {import("discord.js").TextChannel} TC */

// Dependencies
import * as Discord from "discord.js";
import * as cron from "node-cron";

import * as conf from "./utils/configHandler";
import log from "./utils/logger";
import * as timezone from "./utils/timezone";

// Handler
import messageHandler from "./handler/messageHandler";
import messageDeleteHandler from "./handler/messageDeleteHandler";
import BdayHandler from "./handler/bdayHandler";
import AoCHandler from "./handler/aocHandler";
// import * as fadingMessageHandler from "./handler/fadingMessageHandler";
import * as storage from "./storage/storage";

// Other commands
import * as ban from "./commands/modcommands/ban";
import * as poll from "./commands/poll";
import GuildRagequit from "./storage/model/GuildRagequit";
import reactionHandler from "./handler/reactionHandler";
import {
    handleInteractionEvent,
    messageCommandHandler,
    registerAllApplicationCommandsAsGuildCommands
} from "./handler/commandHandler";
import {quoteReactionHandler} from "./handler/quoteHandler";
import NicknameHandler from "./handler/nicknameHandler";
import { assert } from "console";
import { connectAndPlaySaufen } from "./handler/voiceHandler";
import { reminderHandler } from "./commands/erinnerung";

const version = conf.getVersion();
const appname = conf.getName();
const devname = conf.getAuthor();

const splashPadding = 12 + appname.length + version.toString().length;

console.log(
    `\n #${"-".repeat(splashPadding)}#\n` +
    ` # Started ${appname} v${version} #\n` +
    ` #${"-".repeat(splashPadding)}#\n\n` +
    ` Copyright (c) ${(new Date()).getFullYear()} ${devname}\n`
);

log.info("Started.");

const config = conf.getConfig();
const client = new Discord.Client({
    partials: [
        "MESSAGE",
        "REACTION",
        "USER"
    ],
    /* allowedMentions: {
        parse: ["users", "roles"],
        repliedUser: true
    }, */
    intents: ["DIRECT_MESSAGES",
        "GUILDS",
        "GUILD_BANS",
        "GUILD_EMOJIS_AND_STICKERS",
        "GUILD_INTEGRATIONS",
        "GUILD_INVITES",
        "GUILD_MEMBERS",
        "GUILD_MESSAGES",
        "GUILD_MESSAGE_REACTIONS",
        "GUILD_MESSAGE_TYPING",
        "GUILD_PRESENCES",
        "GUILD_VOICE_STATES",
        "GUILD_WEBHOOKS"]
});

// @ts-ignore
process.on("unhandledRejection", (err, promise) => log.error(`Unhandled rejection (promise: ${promise}, reason: ${err.stack})`));
process.on("uncaughtException", (err, origin) => log.error(`Uncaught exception (origin: ${origin}, error: ${err})`));
process.on("SIGTERM", (signal) => log.error(`Received Sigterm: ${signal}`));
process.on("beforeExit", code => {
    log.warn(`Process will exit with code: ${code}`);
    process.exit(code);
});
process.on("exit", code => {
    log.warn(`Process exited with code: ${code}`);
});

let timezoneFixedCronjobTask = null;

function scheduleTimezoneFixedCronjob(cronString) {
    if (timezoneFixedCronjobTask) {
        timezoneFixedCronjobTask.destroy();
        timezoneFixedCronjobTask = null;
    }

    timezoneFixedCronjobTask = cron.schedule(cronString, async() => {
        /** @type {Discord.Guild} */
        const csz = client.guilds.cache.get(config.ids.guild_id);

        /** @type {TC} */
        await (csz.channels.cache.get(config.ids.hauptchat_id)).send("Es ist `13:37` meine Kerle.\nBleibt hydriert! :grin: :sweat_drops:");

        // Auto-kick members
        const sadPinguEmote = csz.emojis.cache.find(e => e.name === "sadpingu");
        const dabEmote = csz.emojis.cache.find(e => e.name === "Dab");

        const membersToKick = csz.members.cache
            .filter(m => m.roles.cache.filter(r => r.name !== "@everyone").size === 0)
            .filter(m => Date.now() - m.joinedTimestamp >= 48 * 3_600_000);

        log.info(`Identified ${membersToKick.size} members that should be kicked.`);

        if (membersToKick.size > 0) {
            // I don't have trust in this code, so ensure that we don't kick any regular members :harold:
            assert(false, membersToKick.some(m => m.roles.cache.some(r => r.name === "Nerd")));

            await Promise.all([
                ...membersToKick.map(member => member.kick())
            ]);

            csz.channels.cache.get(config.ids.hauptchat_id).send(`Hab grad ${membersToKick.size} Jockel*innen gekickt ${dabEmote}`);

            log.info(`Auto-kick: ${membersToKick.size} members kicked.`);
        }
        else {
            csz.channels.cache.get(config.ids.hauptchat_id).send(`Heute leider keine Jockel*innen gekickt ${sadPinguEmote}`);
        }

        const tomorrow = Date.now() + 60/* s*/ * 1000/* ms*/ * 60/* m*/ * 24/* h*/;
        const newCronString = timezone.getCronjobStringForHydrate(tomorrow);
        scheduleTimezoneFixedCronjob(newCronString);
    }, {
        timezone: "Europe/Vienna"
    });
}

let firstRun = true;

client.on("ready", async(_client) => {
    try {
        log.info("Running...");
        log.info(`Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`);
        client.user.setActivity(config.bot_settings.status);

        // When the application is ready, slash commands should be registered
        await registerAllApplicationCommandsAsGuildCommands(client);

        const bday = new BdayHandler(client);
        const aoc = new AoCHandler(client);
        log.info("Starting Nicknamehandler ");
        const nicknameHandler = new NicknameHandler(client);
        if (firstRun) {
            await storage.initialize();
            firstRun = false; // Hacky deadlock ...

            const newCronString = timezone.getCronjobStringForHydrate(Date.now());
            scheduleTimezoneFixedCronjob(newCronString);

            log.info("Scheduling Birthday Cronjob...");
            cron.schedule("1 0 * * *", async() => {
                log.debug("Entered Birthday cronjob");
                await bday.checkBdays();
            }, { timezone: "Europe/Vienna" });
            await bday.checkBdays();

            log.info("Scheduling Advent of Code Cronjob...");
            cron.schedule("0 20 1-25 12 *", async() => {
                log.debug("Entered AoC cronjob");
                await aoc.publishLeaderBoard();
            }, {timezone: "Europe/Vienna"});

            log.info("Scheduling Nickname Cronjob");
            cron.schedule("0 0 * * 0", async() => {
                log.debug("Entered Nickname cronjob");
                await nicknameHandler.rerollNicknames();
            }, {timezone: "Europe/Vienna"});

            log.info("Scheduling Saufen Cronjob");
            cron.schedule("36 0-23 * * FRI-SAT,SUN", async() => {
                log.debug("Entered Saufen cronjob");
                await connectAndPlaySaufen(_client);
            }, {timezone: "Europe/Vienna"});

            log.info("Scheduling Reminder Cronjob");
            cron.schedule("* * * * *", async() => {
                log.debug("Entered reminder cronjob");
                await reminderHandler(_client);
            }, {timezone: "Europe/Vienna"});
        }

        ban.startCron(client);

        await poll.importPolls();
        poll.startCron(client);

        // fadingMessageHandler.startLoop(client);
    }
    catch(err) {
        log.error(`Error in Ready handler: ${err}`);
    }
});


/**
 * This is an additional Message handler, that we use as a replacement
 * for the "old commands". This way we can easily migrate commands to slash commands
 * and still have the option to use the textual commands. Win-Win :cooldoge:
 */
client.on("messageCreate", async(message) => {
    try {
        await messageCommandHandler(message, client);
    }
    catch(err) {
        log.error(`[messageCreate] Error on message ${message.id}. Cause: ${err}`);
    }
});

client.on("interactionCreate", async(interaction) => {
    try {
        await handleInteractionEvent(interaction, client);
    }
    catch(err) {
        log.error(`[interactionCreate] Error on interaction ${interaction.id}. Cause: ${err}`);
    }
});

client.on("guildCreate", guild => log.info(`New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`));

client.on("guildDelete", guild => log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`));

client.on("guildMemberAdd", async member => {
    const numRagequits = await GuildRagequit.getNumRagequits(member.guild.id, member.id);
    if (numRagequits > 0 && !member.roles.cache.has(config.ids.shame_role_id)) {
        if (member.guild.roles.cache.has(config.ids.shame_role_id)) {
            member.roles.add(member.guild.roles.cache.get(config.ids.shame_role_id));

            /** @type {import("discord.js").TextChannel} */
            const hauptchat = member.guild.channels.cache.get(config.ids.hauptchat_id);
            if (hauptchat) {
                hauptchat.send({
                    content: `Haha, schau mal einer guck wer wieder hergekommen ist! <@${member.id}> hast es aber nicht lange ohne uns ausgehalten. ${numRagequits > 1 ? "Und das schon zum " + numRagequits + ". mal" : ""}`,
                    allowedMentions: {
                        users: [member.id]
                    }
                });
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

client.on("guildMemberRemove", async(member) => {
    try {
        await GuildRagequit.incrementRagequit(member.guild.id, member.id);
    }
    catch (err) {
        log.error(`[guildMemberRemove] Error on incrementing ragequit of ${member.id}. Cause: ${err}`);
    }
});

client.on("messageCreate", async(message) => {
    try {
        await messageHandler(message, client);
    }
    catch (err) {
        log.error(`[messageCreate] Error on message ${message.id}. Cause: ${err}`);
    }
});

client.on("messageDelete", (message) => {
    try {
        messageDeleteHandler(message, client);
    }
    catch (err) {
        log.error(`[messageDelete] Error for ${message.id}. Cause: ${err}`);
    }
});

client.on("messageUpdate", async(_, newMessage) => {
    try {
        await messageHandler(/** @type {import("discord.js").Message} */ (newMessage), client);
    }
    catch (err) {
        log.error(`[messageUpdate] Error on message ${newMessage.id}. Cause: ${err}`);
    }
});

client.on("error", (e) => log.error(`Discord Client Error: ${e}`));
client.on("warn", (w) => log.warn(`Discord Client Warning: ${w}`));
client.on("debug", (d) => {
    if(d.includes("Heartbeat")) {
        return;
    }

    log.debug(`Discord Client Debug: ${d}`);
});
client.on("rateLimit", (rateLimitData) => log.error(`Discord Client RateLimit Shit: ${JSON.stringify(rateLimitData)}`));
client.on("invalidated", () => log.debug("Client invalidated"));

client.on("messageReactionAdd", async(event, user) => reactionHandler(event, user, client, false));
client.on("messageReactionAdd", async(event, user) => quoteReactionHandler(event, user, client));
client.on("messageReactionRemove", async(event, user) => reactionHandler(event, user, client, true));

client.login(config.auth.bot_token).then(() => {
    log.info("Token login was successful!");
}, (err) => {
    log.error(`Token login was not successful: "${err}"`);
    log.error("Shutting down due to incorrect token...\n\n");
    process.exit(1);
});
