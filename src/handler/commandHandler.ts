import {
    APIApplicationCommand,
    ApplicationCommandPermissionType,
    Client,
    CommandInteraction,
    Interaction,
    Message,
    MessageComponentInteraction,
    PermissionsBitField,
    PermissionsString,
    REST,
    Routes
} from "discord.js";
import { GuildMember } from "discord.js";

/**
 * Completely new bullish command handler it unifies slash commands and
 * message commands and relies on the "new commands"
 */
import {
    ApplicationCommand,
    Command,
    isApplicationCommand,
    isMessageCommand,
    isSpecialCommand,
    MessageCommand,
    SpecialCommand, UserInteraction

} from "../commands/command.js";
import { InfoCommand } from "../commands/info.js";
import { getConfig } from "../utils/configHandler.js";
import log from "../utils/logger.js";
import { TriggerReactOnKeyword } from "../commands/special/keywordReact.js";
import { WhereCommand } from "../commands/special/where.js";
import { DadJokeCommand } from "../commands/special/dadJoke.js";
import { WatCommand } from "../commands/special/wat.js";
import { TikTokLink } from "../commands/special/tiktok.js";
import { StempelCommand } from "../commands/stempeln.js";
import { StempelgraphCommand } from "../commands/stempelgraph.js";
import { StempelkarteCommand } from "../commands/stempelkarte.js";
import { ban, BanCommand } from "../commands/modcommands/ban.js";
import { UnbanCommand } from "../commands/modcommands/unban.js";
import { PenisCommand } from "../commands/penis.js";
import { BoobCommand } from "../commands/boobs.js";
import { BonkCommand } from "../commands/bonk.js";
import { GoogleCommand } from "../commands/google.js";
import { NischdaaaCommand } from "../commands/special/nischdaaa.js";
import { AutoEhreCommand } from "../commands/special/autoEhre.js";
import { SdmCommand } from "../commands/sdm.js";
import { Nickname, NicknameButtonHandler } from "../commands/nickname.js";
import { WoisLog } from "../commands/woislog.js";
import { FicktabelleCommand } from "../commands/ficktabelle.js";
import { InviteCommand } from "../commands/invite.js";
import { ErleuchtungCommand } from "../commands/erleuchtung.js";
import { MockCommand } from "../commands/mock.js";
import { GeringverdienerCommand } from "../commands/geringverdiener.js";
import { ClapCommand } from "../commands/clap.js";
import { NeverCommand } from "../commands/never.js";
import { GeburtstagCommand } from "../commands/geburtstag.js";
import { Saufen } from "../commands/saufen.js";
import { ErinnerungCommand } from "../commands/erinnerung.js";
import { YoinkCommand } from "../commands/yoink.js";
import { isProcessableMessage, ProcessableMessage } from "./cmdHandler.js";
import { EmoteSenderCommand } from "../commands/special/emoteSender.js";
import { InstagramLink } from "../commands/special/instagram.js";
import { OidaCommand } from "../commands/oida.js";
import { DeOidaCommand } from "../commands/deoida.js";
import { EhreCommand } from "../commands/ehre.js";
import { hasBotDenyRole } from "../utils/userUtils.js";
import { isMessageInBotSpam } from "../utils/channelUtils.js";
import type { BotContext } from "../context.js";
import { WoisCommand } from "../commands/woisvote.js";
import { ApplicationCommandCreationResponse } from "../types.js";
import logger from "../utils/logger.js";
import { AoCCommand } from "../commands/aoc.js";
import { BanListCommand } from "../commands/banlist.js";
import { LinkRedirect } from "../commands/special/linkRedirect.js";

const config = getConfig();

export const commands: readonly Command[] = [
    new InfoCommand(),
    new TriggerReactOnKeyword("nix", "nixos"),
    new TriggerReactOnKeyword("zig", "zig", 0.05),
    new TriggerReactOnKeyword("backend", "🍞", 1),
    new WhereCommand(),
    new DadJokeCommand(),
    new WatCommand(),
    new TikTokLink(),
    new StempelCommand(),
    new StempelgraphCommand(),
    new StempelkarteCommand(),
    new BanCommand(),
    new UnbanCommand(),
    new PenisCommand(),
    new BoobCommand(),
    new BonkCommand(),
    new GoogleCommand(),
    new Nickname(),
    new WoisLog(),
    new NischdaaaCommand(),
    new AutoEhreCommand(),
    new SdmCommand(),
    new WoisCommand(),
    new FicktabelleCommand(),
    new InviteCommand(),
    new ErleuchtungCommand(),
    new MockCommand(),
    new GeringverdienerCommand(),
    new ClapCommand(),
    new NeverCommand(),
    new GeburtstagCommand(),
    new Saufen(),
    new ErinnerungCommand(),
    new YoinkCommand(),
    new EmoteSenderCommand(),
    new InstagramLink(),
    new OidaCommand(),
    new DeOidaCommand(),
    new EhreCommand(),
    new AoCCommand(),
    new BanListCommand(),
    new LinkRedirect()
];
export const interactions: readonly UserInteraction[] = [
    new NicknameButtonHandler()
];

export const applicationCommands: Array<ApplicationCommand> =
    commands.filter<ApplicationCommand>(isApplicationCommand);
export const messageCommands: Array<MessageCommand> =
    commands.filter<MessageCommand>(isMessageCommand);
export const specialCommands: Array<SpecialCommand> =
    commands.filter<SpecialCommand>(isSpecialCommand);

const lastSpecialCommands: Record<string, number> = specialCommands.reduce(
    (acc, cmd) => ({ ...acc, [cmd.name]: 0 }),
    {}
);

const createPermissionSet = (
    permissions: readonly PermissionsString[]
): bigint => {
    const flags = new PermissionsBitField();
    flags.add(...permissions);
    return flags.bitfield;
};

/**
 * Registers all defined applicationCommands as guild commands
 * We're overwriting ALL, therefore no deletion is necessary
 */
export const registerAllApplicationCommandsAsGuildCommands = async(
    context: BotContext
): Promise<void> => {
    const clientId = context.rawConfig.auth.client_id;
    const token = context.rawConfig.auth.bot_token;

    const rest = new REST({ version: "10" }).setToken(token);
    const buildGuildCommand = (
        cmd: ApplicationCommand
    ): APIApplicationCommand => {
        const defaultMemberPermissions = createPermissionSet(
            cmd.requiredPermissions ?? ["SendMessages"]
        );

        const commandCreationData: APIApplicationCommand = {
            ...cmd.applicationCommand.toJSON(),
            dm_permission: false,
            default_member_permissions: defaultMemberPermissions.toString(),

            // Somehow, this permission thing does not make any sense, that's why we assert to `any`
            permissions: [
                {
                    id: config.ids.bot_deny_role_id,
                    type: ApplicationCommandPermissionType.Role,
                    permission: false
                }
            ]
        } as any;
        return commandCreationData;
    };

    const commandsToRegister = applicationCommands
        .map(buildGuildCommand);

    try {
        const url = Routes.applicationGuildCommands(clientId, context.guild.id);
        const response = await rest.put(url, {
            body: commandsToRegister
        }) as ApplicationCommandCreationResponse[];
        logger.info(`Registered ${response.length} guild commands`);
    }
    catch (err) {
        log.error(
            `Could not register application commands for guild ${context.guild.id}`,
            err
        );
    }
};

/**
 * Handles command interactions.
 * @param command the received command interaction
 * @param client client
 * @returns the handled command or an error if no matching command was found.
 */
const commandInteractionHandler = (
    command: CommandInteraction,
    client: Client,
    context: BotContext
): Promise<unknown> => {
    const matchingCommand = applicationCommands.find(
        cmd => cmd.name === command.commandName
    );
    if (matchingCommand) {
        log.debug(`Found a matching command ${matchingCommand.name}`);
        return matchingCommand.handleInteraction(command, client, context);
    }


    return Promise.reject(
        new Error(
            `Application Command ${command.commandName} with ID ${command.id} invoked, but not availabe`
        )
    );
};

/**
 * Handles command interactions.
 * @param command the recieved command interaction
 * @param client client
 * @returns the handled command or an error if no matching command was found.
 */
const messageComponentInteractionHandler = (
    command: MessageComponentInteraction,
    client: Client,
    context: BotContext
): Promise<unknown> => {
    const matchingInteraction = interactions.find(
        cmd => cmd.ids.find(id => id === command.customId
        ));
    if (matchingInteraction) {
        log.debug(`Found a matching interaction ${matchingInteraction.name}`);
        return matchingInteraction.handleInteraction(command, client, context);
    }

    return Promise.reject(new Error(
        `Interaction ${command.customId} invoked, but not availabe`
    ));
};


const checkPermissions = (member: GuildMember, permissions: ReadonlyArray<PermissionsString>): boolean => {
    log.debug(`Checking member ${member.id} permissions on permissionSet: ${JSON.stringify(permissions)}`);

    // No permissions, no problem
    if (permissions.length === 0) {
        return true;
    }

    return member.permissions.has(permissions);
};

/**
 * handles message commands
 * @param commandString the sliced command (e.g. "info")
 * @param message the message which invoked the command
 * @param client client
 * @returns handled message command or nothing if no matching command
 * was found or an error if the command would be a mod command but the
 * invoking user is not a mod
 */
const commandMessageHandler = async(
    commandString: string,
    message: ProcessableMessage,
    client: Client,
    context: BotContext
): Promise<unknown> => {
    const matchingCommand = messageCommands.find(
        cmd => cmd.name.toLowerCase() === commandString.toLowerCase() || cmd.aliases?.includes(commandString.toLowerCase())
    );

    if (hasBotDenyRole(message.member) && !isMessageInBotSpam(message)) {
        await message.member.send(
            "Du hast dich scheinbar beschissen verhalten und darfst daher keine Befehle in diesem Channel ausführen!"
        );
        return;
    }

    if (!matchingCommand) {
        return;
    }

    if (matchingCommand.requiredPermissions) {
        const member = message.guild.members.cache.get(message.author.id);
        if (member && !checkPermissions(member, matchingCommand.requiredPermissions)) {
            return Promise.all([
                ban(client, member, client.user!, "Lol", false, 0.08),
                message.reply({
                    content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`
                })
            ]);
        }
    }
    return matchingCommand.handleMessage(message, client, context);
};

const isCooledDown = (command: SpecialCommand) => {
    const now = Date.now();
    const diff = now - lastSpecialCommands[command.name];
    const cooldownTime = command.cooldownTime ?? 120000;
    // After 2 minutes command is cooled down
    if (diff >= cooldownTime) {
        return true;
    }
    // Otherwise a random function should evaluate the cooldown. The longer the last command was, the higher the chance
    // diff is < fixedCooldown
    return Math.random() < diff / cooldownTime;
};

const specialCommandHandler = (message: ProcessableMessage, client: Client, context: BotContext): Promise<unknown> => {
    const commandCandidates = specialCommands.filter(p => p.matches(message, context));
    return Promise.all(
        commandCandidates
            .filter(c => Math.random() <= c.randomness)
            .filter(c => isCooledDown(c))
            .map(c => {
                log.info(
                    `User "${message.author.tag}" (${message.author}) performed special command: ${c.name}`
                );
                lastSpecialCommands[c.name] = Date.now();
                return c.handleSpecialMessage(message, client, context);
            })
    );
};

export const handleInteractionEvent = (
    interaction: Interaction,
    client: Client,
    context: BotContext
): Promise<unknown> => {
    if (interaction.isCommand()) {
        return commandInteractionHandler(
            interaction as CommandInteraction,
            client,
            context
        );
    }

    if (interaction.isMessageComponent()) {
        return messageComponentInteractionHandler(interaction as MessageComponentInteraction, client, context);
    }
    return Promise.reject(new Error("Not supported"));
};

export const messageCommandHandler = async(
    message: Message,
    client: Client,
    context: BotContext
): Promise<unknown> => {
    // Bots shall not be able to perform commands. High Security
    if (message.author.bot) {
        return;
    }

    // Ensures that every command always gets a message that fits certain criteria (for example, being a message originating from a server, not a DM)
    if (!isProcessableMessage(message)) {
        return;
    }

    // TODO: The Prefix is now completely irrelevant, since the commands itself define
    // their permission.
    const plebPrefix = config.bot_settings.prefix.command_prefix;
    const modPrefix = config.bot_settings.prefix.mod_prefix;
    if (
        message.content.startsWith(plebPrefix) ||
        message.content.startsWith(modPrefix)
    ) {
        const cmdString = message.content.split(/\s+/)[0].slice(1);
        if (cmdString) {
            return commandMessageHandler(cmdString, message, client, context);
        }
    }

    return specialCommandHandler(message, client, context);
};
