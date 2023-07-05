import * as Discord from "discord.js";
import {
    Message,
    MessageReaction,
    User,
    VoiceState,
    GatewayIntentBits,
    Partials,
    Client,
} from "discord.js";
import cron from "croner";

import * as conf from "./utils/configHandler.js";
import log from "./utils/logger.js";

// Handler
import messageHandler from "./handler/messageHandler.js";
import messageDeleteHandler from "./handler/messageDeleteHandler.js";
import BdayHandler from "./handler/bdayHandler.js";
import * as fadingMessageHandler from "./handler/fadingMessageHandler.js";
import * as storage from "./storage/storage.js";

import * as ban from "./commands/modcommands/ban.js";
import * as poll from "./commands/poll.js";
import GuildRagequit from "./storage/model/GuildRagequit.js";
import reactionHandler from "./handler/reactionHandler.js";
import {
    WoisData,
    checkVoiceUpdate,
} from "./handler/voiceStateUpdateHandler.js";

import {
    handleInteractionEvent,
    messageCommandHandler,
    registerAllApplicationCommandsAsGuildCommands,
} from "./handler/commandHandler.js";
import { quoteReactionHandler } from "./handler/quoteHandler.js";
import NicknameHandler from "./handler/nicknameHandler.js";
import { connectAndPlaySaufen } from "./handler/voiceHandler.js";
import { reminderHandler } from "./commands/erinnerung.js";
import { endAprilFools, startAprilFools } from "./handler/aprilFoolsHandler.js";
import { createBotContext, type BotContext } from "./context.js";
import { EhrePoints, EhreVotes } from "./storage/model/Ehre.js";
import {
    woisVoteReactionHandler,
    woisVoteScheduler,
} from "./commands/woisvote.js";
import { ReactionHandler } from "./types.js";
import { AoCHandler } from "./commands/aoc.js";
import { rotate } from "./helper/bannerCarusel.js";
const version = conf.getVersion();
const appname = conf.getName();
const devname = conf.getAuthor();
const args = process.argv.slice(2);

const splashPadding = 12 + appname.length + version.toString().length;

console.log(
    // rome-ignore lint/style/useTemplate: Seems to be more readable this way
    "\n" +
        ` ┌${"─".repeat(splashPadding)}┐\n` +
        ` │ Started ${appname} v${version} │\n` +
        ` └${"─".repeat(splashPadding)}┘\n\n` +
        ` Copyright (c) ${new Date().getFullYear()} ${devname}\n`,
);

let botContext: BotContext;

log.info("Started.");

const config = conf.getConfig();
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

const reactionHandlers: ReactionHandler[] = [woisVoteReactionHandler];

process.on("unhandledRejection", (err: unknown, promise) => {
    log.error(err, `Unhandled rejection (promise: ${promise})`);
});
process.on("uncaughtException", (err, origin) => {
    log.error(err, `Uncaught exception (origin: ${origin}`);
});

process.once("SIGTERM", (signal) => {
    log.error(`Received Sigterm: ${signal}`);
    process.exit(1);
});
process.once("exit", (code) => {
    client.destroy();
    log.warn(`Process exited with code: ${code}`);
});

const clearWoisLogTask = async () => {
    WoisData.latestEvents = WoisData.latestEvents.filter(
        (event) => event.createdAt.getTime() > Date.now() - 2 * 60 * 1000,
    );
};

const leetTask = async () => {
    const { hauptchat } = botContext.textChannels;
    const csz = botContext.guild;

    await hauptchat.send(
        "Es ist `13:37` meine Kerle.\nBleibt hydriert! :grin: :sweat_drops:",
    );

    // Auto-kick members
    const sadPinguEmote = csz.emojis.cache.find((e) => e.name === "sadpingu");
    const dabEmote = csz.emojis.cache.find((e) => e.name === "Dab");

    const membersToKick = (await csz.members.fetch())
        .filter(
            (m) =>
                m.joinedTimestamp !== null &&
                Date.now() - m.joinedTimestamp >= 48 * 3_600_000,
        )
        .filter(
            (m) =>
                m.roles.cache.filter((r) => r.name !== "@everyone").size === 0,
        );

    log.info(
        `Identified ${
            membersToKick.size
        } members that should be kicked, these are: ${membersToKick
            .map((m) => m.displayName)
            .join(",")}.`,
    );

    if (membersToKick.size === 0) {
        await hauptchat.send(
            `Heute leider keine Jocklerinos gekickt ${sadPinguEmote}`,
        );
        return;
    }

    // We don't have trust in this code, so ensure that we don't kick any regular members :harold:
    if (membersToKick.size > 5) {
        // I think we don't need to kick more than 5 members at a time. If so, it is probably a bug and we don't want to to do that
        throw new Error(
            `You probably didn't want to kick ${membersToKick.size} members, or?`,
        );
    }

    // I don't have trust in this code, so ensure that we don't kick any regular members :harold:
    console.assert(
        false,
        membersToKick.some((m) => m.roles.cache.some((r) => r.name === "Nerd")),
    );

    const fetchedMembers = await Promise.all(
        membersToKick.map((m) => m.fetch()),
    );
    if (
        fetchedMembers.some((m) => m.roles.cache.some((r) => r.name === "Nerd"))
    ) {
        throw new Error(
            "There were members that had the nerd role assigned. You probably didn't want to kick them.",
        );
    }

    await Promise.all([...membersToKick.map((member) => member.kick())]);

    await hauptchat.send(
        `Hab grad ${membersToKick.size} Jocklerinos gekickt ${dabEmote}`,
    );

    log.info(`Auto-kick: ${membersToKick.size} members kicked.`);
};

let firstRun = true;

client.once("ready", async (initializedClient) => {
    log.info(
        `Got ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds`,
    );

    try {
        initializedClient.user.setActivity(config.bot_settings.status);

        botContext = await createBotContext(initializedClient);
        console.assert(!!botContext); // TODO: Remove once botContext is used

        const cronOptions = {
            timezone: "Europe/Berlin",
        } as const;

        const birthday = new BdayHandler(botContext);
        const aoc = new AoCHandler(botContext);
        log.info("Starting Nickname Handler ");
        const nicknameHandler = new NicknameHandler(botContext);

        if (firstRun) {
            firstRun = false; // Hacky deadlock ...
            await storage.initialize(botContext);

            cron("37 13 * * *", cronOptions, leetTask);
            cron("5 * * * *", cronOptions, clearWoisLogTask);
            cron("1 0 * * *", cronOptions, async () => {
                log.debug("Entered Birthday cronjob");
                await birthday.checkBdays();
            });
            cron("0 20 1-25 12 *", cronOptions, async () => {
                log.debug("Entered AoC cronjob");
                await aoc.publishLeaderBoard();
            });
            cron("0 0 * * 0", cronOptions, async () => {
                log.debug("Entered Nickname cronjob");
                await nicknameHandler.rerollNicknames();
            });
            cron("36 0-23 * * FRI-SUN", cronOptions, async () => {
                log.debug("Entered Saufen cronjob");
                await connectAndPlaySaufen(botContext);
            });
            cron("* * * * *", cronOptions, async () => {
                log.debug("Entered reminder cronjob");
                await reminderHandler(botContext);
            });
            cron("* * * * *", cronOptions, async () => {
                log.debug("Entered reminder cronjob");
                await woisVoteScheduler(botContext);
            });
            cron("2022-04-01T00:00:00", cronOptions, async () => {
                log.debug("Entered start april fools cronjob");
                await startAprilFools(botContext);
            });
            cron("2022-04-02T00:00:00", cronOptions, async () => {
                log.debug("Entered end april fools cronjob");
                await endAprilFools(botContext);
            });
            cron("1 0 * * *", cronOptions, async () => {
                log.debug("Entered start ehreReset cronjob");
                await Promise.all([
                    EhrePoints.deflation(),
                    EhreVotes.resetVotes(),
                ]);
            });
            cron("0 0 1 */2 *", cronOptions, async () => {
                log.debug("Rotating banners");
                await rotate(botContext);
            });
            // When the application is ready, slash commands should be registered
            await registerAllApplicationCommandsAsGuildCommands(botContext);
        }

        cron("* * * * *", {}, async () => await ban.processBans(botContext));

        await poll.importPolls();

        cron("* * * * *", async () => await poll.processPolls(botContext));

        // Not awaiting this promise because it's basically an infinite loop (that can be cancelled)
        // Possible TODO: Refactor this to a cron job
        void fadingMessageHandler.startLoop(client);

        log.info("Bot successfully started");
        if (args.includes("--dry-run")) {
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
client.on(
    "messageCreate",
    async (message) => await messageCommandHandler(message, client, botContext),
);

client.on(
    "interactionCreate",
    async (interaction) =>
        await handleInteractionEvent(interaction, client, botContext),
);

client.on("guildCreate", (guild) =>
    log.info(
        `New guild joined: ${guild.name} (id: ${guild.id}) with ${guild.memberCount} members`,
    ),
);

client.on("guildDelete", (guild) =>
    log.info(`Deleted from guild: ${guild.name} (id: ${guild.id}).`),
);

client.on("guildMemberAdd", async (member) => {
    const numRagequits = await GuildRagequit.getNumRagequits(
        member.guild.id,
        member.id,
    );
    if (numRagequits === 0) {
        return;
    }

    if (member.roles.cache.has(botContext.roles.shame.id)) {
        log.debug(`Member "${member.id}" already has the shame role, skipping`);
        return;
    }

    await member.roles.add(botContext.roles.shame);

    await botContext.textChannels.hauptchat.send({
        content: `Haha, schau mal einer guck wer wieder hergekommen ist! ${member} hast es aber nicht lange ohne uns ausgehalten. ${
            numRagequits > 1 ? `Und das schon zum ${numRagequits}. mal` : ""
        }`,
        allowedMentions: {
            users: [member.id],
        },
    });
});

client.on(
    "guildMemberRemove",
    async (member) =>
        await GuildRagequit.incrementRagequit(member.guild.id, member.id),
);

client.on(
    "messageCreate",
    async (message) => await messageHandler(message, client, botContext),
);

client.on("messageDelete", async (message) => {
    try {
        if (message.inGuild()) {
            await messageDeleteHandler(message, client, botContext);
        }
    } catch (err) {
        log.error(err, `[messageDelete] Error for ${message.id}`);
    }
});

client.on(
    "messageUpdate",
    async (_, newMessage) =>
        await messageHandler(newMessage as Message, client, botContext),
);

client.on("error", (e) => log.error(e, "Discord Client Error"));
client.on("warn", (w) => log.warn(w, "Discord Client Warning"));
client.on("debug", (d) => {
    if (d.includes("Heartbeat")) {
        return;
    }

    log.debug(d, "Discord Client Debug d");
});
client.on("rateLimit", (data) =>
    log.error(data, "Discord Client RateLimit Shit"),
);
client.on("invalidated", () => log.debug("Client invalidated"));

// TODO: Refactor to include in reaction handlers
client.on("messageReactionAdd", async (event, user) =>
    reactionHandler(event as MessageReaction, user as User, client, false),
);
client.on(
    "messageReactionAdd",
    async (event, user) =>
        await quoteReactionHandler(
            event as MessageReaction,
            user as User,
            botContext,
        ),
);
client.on(
    "messageReactionRemove",
    async (event, user) =>
        await reactionHandler(
            event as MessageReaction,
            user as User,
            client,
            true,
        ),
);

client.on("messageReactionAdd", async (event, user) => {
    for (const handler of reactionHandlers) {
        await handler(
            event as MessageReaction,
            user as User,
            botContext,
            false,
        );
    }
});
client.on("messageReactionRemove", async (event, user) => {
    for (const handler of reactionHandlers) {
        await handler(event as MessageReaction, user as User, botContext, true);
    }
});

client.on(
    "voiceStateUpdate",
    async (oldState, newState) =>
        await checkVoiceUpdate(
            oldState as VoiceState,
            newState as VoiceState,
            botContext,
        ),
);

function login() {
    return new Promise<Client<true>>((resolve) => {
        client.once("ready", resolve);
        client.login(config.auth.bot_token);
    });
}

login().then(
    (client) => {
        log.info(`Bot logged in as ${client.user.tag}`);
        log.info(
            `Prefixes: "${config.bot_settings.prefix.command_prefix}" and "${config.bot_settings.prefix.mod_prefix}"`,
        );
    },
    (err) => {
        log.error(err, "Token login was not successful");
        log.error("Shutting down due to incorrect token...");
        process.exit(1);
    },
);
