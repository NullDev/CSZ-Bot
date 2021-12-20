// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/** @typedef {import("discord.js").TextChannel} TC */

// Dependencies
import * as Discord from "discord.js";
import * as cron from "node-cron";

import * as conf from "./utils/configHandler";
import * as log from "./utils/logger";
import * as timezone from "./utils/timezone";

// Handler
import messageHandler from "./handler/messageHandler";
import messageDeleteHandler from "./handler/messageDeleteHandler";
import BdayHandler from "./handler/bdayHandler";
import AoCHandler from "./handler/aocHandler";
import * as fadingMessageHandler from "./handler/fadingMessageHandler";
import * as storage from "./storage/storage";

// Other commands
import * as ban from "./commands/modcommands/ban";
import * as poll from "./commands/poll";
import GuildRagequit from "./storage/model/GuildRagequit";
import reactionHandler from "./handler/reactionHandler";
import { handleInteractionEvent, messageCommandHandler, registerAllApplicationCommandsAsGuildCommands } from "./handler/commandHandler";
import {quoteReactionHandler} from "./handler/quoteHandler";

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
const client = new Discord.Client({
    partials: [
        "MESSAGE",
        "REACTION",
        "USER"
    ],
    allowedMentions: {
        parse: ["users", "roles"],
        repliedUser: true
    },
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

let timezoneFixedCronjobTask = null;

function scheduleTimezoneFixedCronjob(cronString) {
    if (timezoneFixedCronjobTask) {
        timezoneFixedCronjobTask.destroy();
        timezoneFixedCronjobTask = null;
    }

    timezoneFixedCronjobTask = cron.schedule(cronString, () => {
        let csz = client.guilds.cache.get(config.ids.guild_id);

        /** @type {TC} */
        (csz.channels.cache.get(config.ids.hauptchat_id)).send("Es ist `13:37` meine Kerle.\nBleibt hydriert! :grin: :sweat_drops:");

        // Auto-kick members
        const sadPinguEmote = csz.emojis.cache.find(e => e.name === "sadpingu");
        const dabEmote = csz.emojis.cache.find(e => e.name === "Dab");
        let cnt = 0;

        csz.members.cache.filter(m => {
            return m && m.roles.cache.filter(r => r.name !== "@everyone").size === 0 && Date.now() - m.joinedTimestamp >= 48 * 3_600_000;
        }).forEach(member => {
            member.kick();
            cnt++;
        });

        log.info(`Auto-kick: ${cnt} members kicked.`);
        if(cnt > 0){
            csz.channels.cache.get(config.ids.hauptchat_id).send(`Hab grad ${cnt} Jockel gekickt ${dabEmote}`);
        }
        else {
            csz.channels.cache.get(config.ids.hauptchat_id).send(`Heute leider keine Jockel gekickt ${sadPinguEmote}`);
        }

        const tomorrow = Date.now() + 60/* s*/ * 1000/* ms*/ * 60/* m*/ * 24/* h*/;
        const newCronString = timezone.getCronjobStringForHydrate(tomorrow);
        scheduleTimezoneFixedCronjob(newCronString);
    }, {
        timezone: "Europe/Vienna"
    });
}

let firstRun = true;
client.on("ready", async() => {
    log.info("Running...");
    log.info(`Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`);
    client.user.setActivity(config.bot_settings.status);

    const bday = new BdayHandler(client);
    const aoc = new AoCHandler(client);
    if (firstRun){
        await storage.initialize();
        firstRun = false; // Hacky deadlock ...

        const newCronString = timezone.getCronjobStringForHydrate(Date.now());
        scheduleTimezoneFixedCronjob(newCronString);

        cron.schedule("1 0 * * *", async() => await bday.checkBdays(), { timezone: "Europe/Vienna" });
        await bday.checkBdays();

        cron.schedule("0 20 1-25 12 *", async() => await aoc.publishLeaderBoard(), { timezone: "Europe/Vienna" });
    }

    ban.startCron(client);

    await poll.importPolls();
    poll.startCron(client);

    fadingMessageHandler.startLoop(client);
});

/**
 * When the application is ready, slash commands should be registered
 */
client.on("ready", async() => {
    registerAllApplicationCommandsAsGuildCommands(client);
});

/**
 * This is an additional Message handler, that we use as a replacement
 * for the "old commands". This way we can easily migrate commands to slash commands
 * and still use the possility to use the commands textual. Win-Win :cooldoge:
 */
client.on("messageCreate", async(message) => {
    messageCommandHandler(message, client);
});

client.on("interactionCreate", async(interaction) => handleInteractionEvent(interaction, client));

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

client.on("messageDelete", (message) => messageDeleteHandler(message, client));

client.on("messageUpdate", (_, newMessage) => messageHandler(/** @type {import("discord.js").Message} */ (newMessage), client));

client.on("error", log.error);

client.on("messageReactionAdd", async(event, user) => reactionHandler(event, user, client, false));
client.on("messageReactionAdd", async(event, user) => quoteReactionHandler(event, user, client));
client.on("messageReactionRemove", async(event, user) => reactionHandler(event, user, client, true));

client.login(config.auth.bot_token).then(() => {
    log.done("Token login was successful!");
}, (err) => {
    log.error(`Token login was not successful: "${err}"`);
    log.error("Shutting down due to incorrect token...\n\n");
    process.exit(1);
});
