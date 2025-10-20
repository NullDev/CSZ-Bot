import { GatewayIntentBits, Partials, Client } from "discord.js";
import * as sentry from "@sentry/node";

import { readConfig, databasePath, args } from "@/service/config.js";
import log from "@log";

import { Temporal } from "@js-temporal/polyfill";
import "@/polyfills.js";

import * as kysely from "@/storage/db/db.js";

import type { ReactionHandler } from "@/handler/ReactionHandler.js";
import messageDeleteHandler from "@/handler/messageDeleteHandler.js";
import roleAssignerHandler from "@/handler/roleAssignerHandler.js";
import pollReactionHandler from "@/handler/pollReactionHandler.js";
import logEmotesReactionHandler from "@/handler/logEmotesReactionHandler.js";
import quoteReactionHandler from "@/handler/quoteHandler.js";
import { woisVoteReactionHandler } from "@/commands/woisvote.js";
import * as voiceStateService from "@/service/voiceState.js";

import {
    handleInteractionEvent,
    loadCommands,
    messageCommandHandler,
    registerAllApplicationCommandsAsGuildCommands,
} from "@/handler/commandHandler.js";
import deleteThreadMessagesHandler from "@/handler/deleteThreadMessagesHandler.js";
import { createBotContext, type BotContext } from "@/context.js";
import { ehreReactionHandler } from "@/commands/ehre.js";
import * as terminal from "@/utils/terminal.js";
import * as guildRageQuit from "@/storage/guildRageQuit.js";
import * as cronService from "@/service/cron.js";
import { handlePresenceUpdate } from "./handler/presenceHandler.js";

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
// TODO: Remove this once temporal is available in Node.js
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
        log.info(`Prefixes: "${config.prefix.command}" and "${config.prefix.modCommand}"`);
        client.user.setActivity(config.activity);
    },
    err => {
        log.error(err, "Token login was not successful");
        log.error("Shutting down due to incorrect token...");
        process.exit(1);
    },
);

let botContext: BotContext;
client.once("clientReady", async initializedClient => {
    try {
        botContext = await createBotContext(initializedClient);

        await loadCommands(botContext);

        await cronService.schedule(botContext);

        // When the application is ready, slash commands should be registered
        await registerAllApplicationCommandsAsGuildCommands(botContext);

        log.info("Bot successfully started");
        if (args.values["dry-run"]) {
            process.exit(0);
        }
    } catch (err) {
        log.error(err, "Error in `ready` handler");
        process.exit(1);
    }
});

client.on("interactionCreate", interaction => handleInteractionEvent(interaction, botContext));

client.on("guildCreate", guild =>
    log.info(`New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`),
);

client.on("guildDelete", guild => log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`));

client.on("guildMemberAdd", async member => {
    const numRageQuits = await guildRageQuit.getNumRageQuits(member.guild, member);
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

client.on("guildMemberRemove", member => guildRageQuit.incrementRageQuit(member.guild, member));

client.on("messageCreate", message => messageCommandHandler(message, botContext));
client.on("messageCreate", m => deleteThreadMessagesHandler(m, botContext));

client.on("messageDelete", async message => {
    if (!message.inGuild()) {
        return;
    }

    await messageDeleteHandler(message, botContext).catch(err => {
        log.error(err, `[messageDelete] Error for ${message.id}`);
        sentry.captureException(err);
    });
});

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

client.on("voiceStateUpdate", (old, next) =>
    voiceStateService.checkVoiceUpdate(old, next, botContext),
);

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
