import { GatewayIntentBits, Partials, Client } from "discord.js";
import * as sentry from "@sentry/node";

import { readConfig, databasePath, args } from "#service/config.ts";
import log from "#log";

import { Temporal } from "@js-temporal/polyfill";
import "#polyfills.ts";

import * as kysely from "#storage/db/db.ts";

import type { ReactionHandler } from "#handler/ReactionHandler.ts";
import messageDeleteHandler from "#handler/messageDeleteHandler.ts";
import { woisVoteReactionHandler } from "#commands/woisvote.ts";
import * as voiceStateService from "#service/voiceState.ts";

import roleAssignerHandler from "#handler/reaction/roleAssignerHandler.ts";
import pollReactionHandler from "#handler/reaction/pollReactionHandler.ts";
import logEmotesReactionHandler from "#handler/reaction/logEmotesReactionHandler.ts";
import quoteReactionHandler from "#handler/reaction/quoteHandler.ts";

import {
    handleInteractionEvent,
    loadCommands,
    messageCommandHandler,
    registerAllApplicationCommandsAsGuildCommands,
} from "#handler/commandHandler.ts";
import * as guildMemberHandler from "#handler/guildMemberHandler.ts";
import deleteThreadMessagesHandler from "#handler/messageCreate/deleteThreadMessagesHandler.ts";
import { createBotContext, type BotContext } from "#context.ts";
import { ehreReactionHandler } from "#commands/ehre.ts";
import * as terminal from "#utils/terminal.ts";
import * as cronService from "#service/cron.ts";
import { handlePresenceUpdate } from "./handler/presenceHandler.ts";

const env = process.env;

const release =
    env.RELEASE_IDENTIFIER && env.BUILD_NUMBER
        ? `csz-bot@0.0.0-build.${env.BUILD_NUMBER}+commit.${env.RELEASE_IDENTIFIER}`
        : undefined;

{
    const prodMode = env.NODE_ENV === "production" ? terminal.highlightWarn(" prod mode ") : "";

    const cszBot = terminal.highlight(" CSZ Bot ");
    const year = new Date().getFullYear();

    console.log();
    console.log(" ┌───────────┐");
    console.log(` │ ${cszBot} │ Copyright (c) ${year} Users of the CSZ`);
    console.log(" └───────────┘");
    console.log(`  ${prodMode} ${release ? `(${release})` : ""} log level: ${log.level}`);
}

log.info(`Bot starting up...${release ? ` (release: ${release})` : ""}`);

const config = await readConfig();

// This polyfill requires that Temporal is already available in the runtime
// We cannot add it in the polyfills.ts because that file is also used as --require argument for ts-node
// TODO: Remove this once temporal is available in Node.js, see: https://github.com/nodejs/node/issues/57127
if (typeof Date.prototype.toTemporalInstant !== "function") {
    Date.prototype.toTemporalInstant = function () {
        return Temporal.Instant.fromEpochMilliseconds(this.getTime());
    };
}

if (config.sentry?.dsn) {
    sentry.init({
        dsn: config.sentry.dsn,
        environment: env.NODE_ENV,
        release,
        tracesSampleRate: config.sentry?.tracesSampleRate ?? 1,
    });
}

if (!config.auth.clientId || !config.auth.token) {
    log.error(
        "No bot token found in config. Make sure to set `auth.clientId` and `auth.token` in `config.json`",
    );
    process.exit(1);
}

await kysely.connectToDb(databasePath);

const client = new Client({
    partials: [Partials.Message, Partials.Reaction, Partials.User],
    allowedMentions: {
        parse: ["users"],
        repliedUser: true,
    },
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildExpressions,
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
    pollReactionHandler,
    logEmotesReactionHandler,
    quoteReactionHandler,
    ehreReactionHandler,
    woisVoteReactionHandler,
    roleAssignerHandler,
];

process.on("unhandledRejection", err => log.error(err, "Unhandled rejection"));
process.on("uncaughtException", (err, origin) =>
    log.error(err, `Uncaught exception (origin: ${origin})`),
);

process.once("SIGTERM", signal => {
    log.fatal(`Received SIGTERM: ${signal}`);
    process.exit(1);
});
process.once("exit", code => {
    const _ = client.destroy();
    const __ = kysely.disconnectFromDb();
    log.warn(`Process exited with code: ${code}`);
});

let botContext: BotContext;
login().then(
    async client => {
        log.info(`Logged in as ${client.user.tag}`);
        log.info(
            `Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`,
        );
        log.info(`Prefixes: "${config.prefix.command}" and "${config.prefix.modCommand}"`);
        client.user.setActivity(config.activity);

        try {
            botContext = await createBotContext(client);

            await loadCommands(botContext);

            await cronService.schedule(botContext);

            // When the application is ready, slash commands should be registered
            await registerAllApplicationCommandsAsGuildCommands(botContext);
        } catch (err) {
            sentry.captureException(err);
            log.error(err, "Error in `ready` handler");
            process.exit(1);
        }

        log.info("Registering main event handlers...");

        client.on("messageCreate", m => messageCommandHandler(m, botContext));
        client.on("messageCreate", m => deleteThreadMessagesHandler(m, botContext));
        client.on("guildMemberAdd", m => guildMemberHandler.added(botContext, m));
        client.on("guildMemberRemove", m => guildMemberHandler.removed(botContext, m));
        client.on("interactionCreate", i => handleInteractionEvent(i, botContext));
        client.on("voiceStateUpdate", (old, next) =>
            voiceStateService.checkVoiceUpdate(old, next, botContext),
        );
        client.on("messageDelete", async message => {
            if (!message.inGuild()) {
                return;
            }

            await messageDeleteHandler(message, botContext).catch(err => {
                log.error(err, `[messageDelete] Error for ${message.id}`);
                sentry.captureException(err);
            });
        });

        log.info("Bot successfully started");

        if (args.values["dry-run"]) {
            log.info("--dry-run was specified, shutting down");
            process.exit(0);
        }

        if (botContext.sendWelcomeMessage) {
            await botContext.textChannels.hauptchat.send(
                `Hallo, ich wurde gerade gestartet!\nMeine Präfixe sind: \`${botContext.prefix.command}\`/\`${botContext.prefix.modCommand}\``,
            );
            log.info("Sent welcome message");
        }
    },
    err => {
        log.error(err, "Token login was not successful");
        log.error("Shutting down due to incorrect token...");
        process.exit(1);
    },
);

client.on("guildCreate", guild =>
    log.info(`New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`),
);

client.on("guildDelete", guild => log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`));

client.on("error", e => log.error(e, "Discord Client Error"));
client.on("warn", w => log.warn(`Discord Client Warning: "${w}"`));
client.on("rateLimit", d => log.error(d, "Discord client rate limit reached"));
client.on("invalidated", () => log.debug("Client invalidated"));

client.on("messageReactionAdd", async (event, user) => {
    const [entireEvent, entireUser] = await Promise.all([event.fetch(), user.fetch()]);

    for (const handler of reactionHandlers) {
        await handler.execute(entireEvent, entireUser, botContext, false).catch(err => {
            log.error(err, `Handler "${handler.displayName}" failed during "messageReactionAdd".`);
            sentry.captureException(err);
        });
    }
});
client.on("messageReactionRemove", async (event, user) => {
    const [entireEvent, entireUser] = await Promise.all([event.fetch(), user.fetch()]);

    for (const handler of reactionHandlers) {
        await handler.execute(entireEvent, entireUser, botContext, true).catch(err => {
            log.error(
                err,
                `Handler "${handler.displayName}" failed during "messageReactionRemove".`,
            );
            sentry.captureException(err);
        });
    }
});

client.on("presenceUpdate", async (oldPresence, newPresence) => {
    try {
        await handlePresenceUpdate(botContext, oldPresence, newPresence);
    } catch (cause) {
        log.warn(cause, "Exception during `presenceUpdate`.");
    }
});

function login() {
    return new Promise<Client<true>>(resolve => {
        client.once("clientReady", resolve);
        client.login(config.auth.token);
    });
}
