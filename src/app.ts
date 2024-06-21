import * as Discord from "discord.js";
import { GatewayIntentBits, Partials, type Client } from "discord.js";
import * as sentry from "@sentry/node";

import type { ReactionHandler } from "./types.js";

import * as conf from "./utils/configHandler.js";
import log from "@log";

import "./polyfills.js";

import messageHandler from "./handler/messageHandler.js";
import messageDeleteHandler from "./handler/messageDeleteHandler.js";
import * as fadingMessageHandler from "./handler/fadingMessageHandler.js";
import * as kysely from "./storage/db/db.js";

import reactionHandler from "./handler/reactionHandler.js";
import { checkVoiceUpdate } from "./handler/voiceStateUpdateHandler.js";

import {
    handleInteractionEvent,
    messageCommandHandler,
    registerAllApplicationCommandsAsGuildCommands,
} from "./handler/commandHandler.js";
import quoteReactionHandler from "./handler/quoteHandler.js";
import { createBotContext, type BotContext } from "./context.js";
import { ehreReactionHandler } from "./commands/ehre.js";
import { woisVoteReactionHandler } from "./commands/woisvote.js";
import deleteThreadMessagesHandler from "./handler/deleteThreadMessagesHandler.js";
import * as terminal from "./terminal.js";
import * as guildRageQuit from "./storage/guildRageQuit.js";
import { scheduleCronjobs } from "./handler/cronjobs.js";
import { args } from "./utils/configHandler.js";

{
    const prodMode =
        process.env.NODE_ENV === "production"
            ? ` ${terminal.highlightWarn(" production ")} mode`
            : "";

    const cszBot = terminal.highlight(" CSZ Bot ");
    const year = new Date().getFullYear();

    console.log();
    console.log(" ┌───────────┐");
    console.log(` │ ${cszBot} │ Copyright (c) ${year} Users of the CSZ`);
    console.log(` └───────────┘${prodMode}`);
    console.log();
}

let botContext: BotContext;

log.info("Bot starting up...");
const config = conf.getConfig();

if (config.sentry?.dsn) {
    sentry.init({
        dsn: config.sentry?.dsn,
    });
}

if (!config.auth.bot_token) {
    log.error(
        "No bot token found in config. Make sure to set `auth.bot_token` and `auth.client_id` in `config.json`",
    );
    process.exit(1);
}

await kysely.connectToDb(conf.databasePath);

const client = new Discord.Client({
    partials: [Partials.Message, Partials.Reaction, Partials.User],
    allowedMentions: {
        parse: ["users"],
        repliedUser: true,
    },
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
    ],
});

/**
 * All of them will be executed in the given order, regardless of their result or if they throw an error.
 */
const reactionHandlers: ReactionHandler[] = [
    reactionHandler,
    quoteReactionHandler,
    ehreReactionHandler,
    woisVoteReactionHandler,
];

process.on("unhandledRejection", (err: unknown, promise) => {
    log.error(err, `Unhandled rejection (promise: ${promise})`);
});
process.on("uncaughtException", (err, origin) => {
    log.error(err, `Uncaught exception (origin: ${origin})`);
});

process.once("SIGTERM", signal => {
    log.fatal(`Received Sigterm: ${signal}`);
    process.exit(1);
});
process.once("exit", code => {
    client.destroy();
    kysely.disconnectFromDb();
    log.warn(`Process exited with code: ${code}`);
});

login().then(
    client => {
        log.info(`Logged in as ${client.user.tag}`);
        log.info(
            `Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`,
        );
        log.info(
            `Prefixes: "${config.bot_settings.prefix.command_prefix}" and "${config.bot_settings.prefix.mod_prefix}"`,
        );
        client.user.setActivity(config.bot_settings.status);
    },
    err => {
        log.error(err, "Token login was not successful");
        log.error("Shutting down due to incorrect token...");
        process.exit(1);
    },
);

client.once("ready", async initializedClient => {
    try {
        botContext = await createBotContext(initializedClient);

        await scheduleCronjobs(botContext);

        // When the application is ready, slash commands should be registered
        await registerAllApplicationCommandsAsGuildCommands(botContext);

        // Not awaiting this promise because it's basically an infinite loop (that can be cancelled)
        // Possible TODO: Refactor this to a cron job
        void fadingMessageHandler.startLoop(client);

        log.info("Bot successfully started");
        if (args.values["dry-run"]) {
            process.exit(0);
        }
    } catch (err) {
        log.error(err, "Error in Ready handler");
        process.exit(1);
    }
});

/**
 * This is an additional Message handler, that we use as a replacement
 * for the "old commands". This way we can easily migrate commands to slash commands
 * and still have the option to use the textual commands. Win-Win :cooldoge:
 */
client.on("messageCreate", message =>
    messageCommandHandler(message, botContext),
);

client.on("interactionCreate", interaction =>
    handleInteractionEvent(interaction, botContext),
);

client.on("guildCreate", guild =>
    log.info(
        `New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`,
    ),
);

client.on("guildDelete", guild =>
    log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`),
);

client.on("guildMemberAdd", async member => {
    const numRageQuits = await guildRageQuit.getNumRageQuits(
        member.guild,
        member,
    );

    if (numRageQuits === 0) {
        return;
    }

    if (member.roles.cache.has(botContext.roles.shame.id)) {
        log.debug(`Member "${member.id}" already has the shame role, skipping`);
        return;
    }

    await member.roles.add(botContext.roles.shame);

    await botContext.textChannels.hauptchat.send({
        content: `Haha, schau mal einer guck wer wieder hergekommen ist! ${member} hast es aber nicht lange ohne uns ausgehalten. ${
            numRageQuits > 1 ? `Und das schon zum ${numRageQuits}. mal` : ""
        }`,
        allowedMentions: {
            users: [member.id],
        },
    });
});

client.on("guildMemberRemove", member =>
    guildRageQuit.incrementRageQuit(member.guild, member),
);

client.on("messageCreate", m => messageHandler(m, botContext));
client.on("messageCreate", m => deleteThreadMessagesHandler(m, botContext));

client.on("messageDelete", async message => {
    try {
        if (message.inGuild()) {
            await messageDeleteHandler(message, botContext);
        }
    } catch (err) {
        log.error(err, `[messageDelete] Error for ${message.id}`);
    }
});

client.on(
    "messageUpdate",
    async (_, newMessage) =>
        await messageHandler(
            newMessage.partial ? await newMessage.fetch() : newMessage,
            botContext,
        ),
);

client.on("error", e => log.error(e, "Discord Client Error"));
client.on("warn", w => log.warn(w, "Discord Client Warning"));
client.on("debug", d => {
    if (d.includes("Heartbeat")) {
        return;
    }
    log.debug(d, "Discord Client Debug");
});
client.on("rateLimit", d => log.error(d, "Discord client rate limit reached"));
client.on("invalidated", () => log.debug("Client invalidated"));

client.on("messageReactionAdd", async (event, user) => {
    const [entireEvent, entireUser] = await Promise.all([
        event.fetch(),
        user.fetch(),
    ]);

    for (const handler of reactionHandlers) {
        try {
            await handler.execute(entireEvent, entireUser, botContext, false);
        } catch (err) {
            log.error(
                err,
                `Handler "${handler.displayName}" failed during "messageReactionAdd".`,
            );
        }
    }
});
client.on("messageReactionRemove", async (event, user) => {
    const [entireEvent, entireUser] = await Promise.all([
        event.fetch(),
        user.fetch(),
    ]);

    for (const handler of reactionHandlers) {
        try {
            await handler.execute(entireEvent, entireUser, botContext, true);
        } catch (err) {
            log.error(
                err,
                `Handler "${handler.displayName}" failed during "messageReactionRemove".`,
            );
        }
    }
});

client.on("voiceStateUpdate", (old, next) =>
    checkVoiceUpdate(old, next, botContext),
);

function login() {
    return new Promise<Client<true>>(resolve => {
        client.once("ready", resolve);
        client.login(config.auth.bot_token);
    });
}
