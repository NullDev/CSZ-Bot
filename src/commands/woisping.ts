import {
    Client, CommandInteraction,
    MessageComponentInteraction,
    ButtonStyle,
    cleanContent, SlashCommandBuilder, SlashCommandStringOption, ComponentType
} from "discord.js";

import { ApplicationCommand, CommandResult, UserInteraction } from "./command.js";
import log from "../utils/logger.js";
import { isMod, isWoisGang } from "../utils/userUtils.js";
import { getConfig } from "../utils/configHandler.js";

const config = getConfig();

const pendingMessagePrefix = "*(Pending-Woisgang-Ping, bitte zustimmen)*";

// Internal storage, no need to save this persistent
let lastPing = 0;
const reasons: Record<string, string> = {};
const pingVoteMap: Record<string, Set<string>> = {};

const getOrCreatePingVoteMap = (messageId: string): Set<string> => {
    pingVoteMap[messageId] ??= new Set();
    return pingVoteMap[messageId];
};

const getMessage = (reason: string, usersVotedYes: string[] = []) => {
    return usersVotedYes.length === 1
        ? `<@&${config.ids.woisgang_role_id}> <@!${usersVotedYes[0]}> hat Bock auf Wois. Grund dafür ist \`${reason}\``
        : `<@&${config.ids.woisgang_role_id}> <@!${usersVotedYes.join(">,<@!")}> haben Bock auf Wois. Grund dafür ist \`${reason}\``;
};

export class WoisCommand implements ApplicationCommand {
    name = "woisping";
    description = "Pingt die ganze Woisgang";

    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(
                new SlashCommandStringOption()
                    .setName("grund")
                    .setRequired(true)
                    .setDescription("Saufen, brauchts noch n weiteren grund?")
            );
    }

    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<CommandResult> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const pinger = command.guild?.members.cache.get(command.member!.user.id)!;

        const isModMessage = isMod(pinger);

        if (!isModMessage && !isWoisGang(pinger)) {
            log.warn(`User (${pinger}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);
            await command.reply(`Tut mir leid, ${pinger}. Du hast nicht genügend Rechte um diesen Command zu verwenden =(`);
            return;
        }
        const now = Date.now();
        if (!isModMessage && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
            await command.reply("Piss dich und spam nicht.");
            return;
        }

        const reason = `${cleanContent(command.options.getString("grund", true), command.channel!)}`;
        if (isModMessage) {
            lastPing = now;

            const usersVotedYes = [pinger.id];
            const content = getMessage(reason, usersVotedYes).trim();

            await command.reply({
                content,
                allowedMentions: {
                    parse: ["users", "roles"],
                    roles: [config.ids.woisgang_role_id],
                    users: usersVotedYes
                },
                components: []
            });
            return;
        }

        await command.reply({
            content: `${pendingMessagePrefix} ${pinger} hat Bock auf Wois. ${reason ? `Grund dafür ist \`${reason}\`` : ""}. Biste dabei?`,
            allowedMentions: {
                users: [pinger.id]
            },
            components: [{
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        customId: "woisbutton",
                        label: "Ich hab Bock",
                        style: ButtonStyle.Success
                    }
                ]
            }]
        });

        const message = await command.fetchReply();
        reasons[message.id] = reason;

        const voteMap = getOrCreatePingVoteMap(message.id);
        voteMap.add(pinger.id);
    }
}

export class WoisButton implements UserInteraction {
    readonly ids = ["woisbutton"];
    readonly name = "Woisbutton";

    async handleInteraction(command: MessageComponentInteraction, client: Client): Promise<void> {
        if (!command.channel || !command.guild || !command.member) {
            return;
        }

        const member = command.guild.members.cache.get(command.member.user.id)!;
        const isModMessage = isMod(member);
        if (!isModMessage && !isWoisGang(member)) {
            await command.reply({
                content: "Sorry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.",
                ephemeral: true
            });
            return;
        }

        const voteMap = getOrCreatePingVoteMap(command.message.id);
        voteMap.add(member.id);
        const amount = voteMap.size;
        const now = Date.now();
        if (isModMessage || (amount >= config.bot_settings.woisping_threshold)) {
            const reason = reasons[command.message.id];
            lastPing = now;

            const usersVotedYes = [...voteMap];
            const content = getMessage(reason, usersVotedYes).trim();

            await command.channel.send({
                content,
                allowedMentions: {
                    parse: ["users", "roles"],
                    roles: [config.ids.woisgang_role_id],
                    users: usersVotedYes
                },
                components: []
            });

            await command.update({ content: " Woisping ist durch", components: [] });
            return;
        }
        await command.reply({
            content: "Jetzt müssen nur die anderen Bock drauf haben.",
            ephemeral: true
        });
    }
}

export const description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
