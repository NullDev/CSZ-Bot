// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

import {
    CommandInteraction, MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    Util
} from "discord.js";
import {Client} from "discord.js";
import {ApplicationCommand, CommandPermission, CommandResult, UserInteraction} from "./command";
import log from "../utils/logger";


import {isMod, isWoisGang} from "../utils/userUtils";

import {getConfig} from "../utils/configHandler";
import {SlashCommandBuilder, SlashCommandStringOption} from "@discordjs/builders";

const config = getConfig();

const pendingMessagePrefix = "*(Pending-Woisgang-Ping, bitte zustimmen)*";

// Internal storage, no need to save this persistent
let lastPing = 0;
const reasons: Record<string, string> = {};
const pingvoteMap: Record<string, Set<string>> = {};

const getPingVoteMap = (messageid: string): Set<string> => {
    if (pingvoteMap[messageid] === undefined) {
        pingvoteMap[messageid] = new Set();
    }
    return pingvoteMap[messageid];
};

const getMessage = (reason: string, usersVotedYes: string[] = []) => {
    const content = usersVotedYes.length === 1 ? `<@&${config.ids.woisgang_role_id}> <@!${usersVotedYes[0]}> hat Bock auf Wois. Grund dafür ist \`${reason}\`` :
        `<@&${config.ids.woisgang_role_id}> <@!${usersVotedYes.join(">,<@!")}> haben Bock auf Wois. Grund dafür ist \`${reason}\``;
    return {
        content: content.trim(),
        allowedMentions: {
            roles: [config.ids.woisgang_role_id],
            users: usersVotedYes
        },
        components: []
    };
};


export class WoisCommand implements ApplicationCommand {
    name = "woisping";
    description = "Pingt die ganze Woisgang";
    permissions: readonly CommandPermission[] = [];

    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
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
        const pinger = command.guild?.members.cache.get(command.member!.user.id)!;

        const isModMessage = isMod(pinger);

        if (!isModMessage && !isWoisGang(pinger)) {
            log.warn(`User (${pinger}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);
            return command.reply(`Tut mir leid, ${pinger}. Du hast nicht genügend Rechte um diesen Command zu verwenden =(`);
        }
        const now = Date.now();
        if (!isModMessage && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
            return command.reply("Piss dich und spam nicht.");
        }
        const reason = `${Util.cleanContent(command.options.getString("grund", true), command.channel!)}`;
        if (isModMessage) {
            lastPing = now;
            return command.reply(getMessage(reason, [pinger.id]));
        }
        const row = new MessageActionRow()
            .addComponents(new MessageButton()
                .setCustomId("woisbutton")
                .setLabel("Ich hab Bock")
                .setStyle("SUCCESS")
            );
        await command.reply({
            content: `${pendingMessagePrefix} <@!${pinger.id}> hat Bock auf Wois. ${reason ? `Grund dafür ist \`${reason}\`` : ""}. Biste dabei?`,
            allowedMentions: {
                users: [pinger.id]
            },
            components: [row]
        });
        const message = await command.fetchReply();
        reasons[message.id] = reason;
        const pingVoteMap = getPingVoteMap(message.id);
        pingVoteMap.add(pinger.id);
    }
}

export class WoisButton implements UserInteraction {
    readonly ids = ["woisbutton"];
    readonly name = "Woisbutton";

    async handleInteraction(command: MessageComponentInteraction, client: Client): Promise<void> {
        const member = command.guild?.members.cache.get(command.member!.user.id)!;
        const isModMessage = isMod(member);
        if (!isModMessage && !isWoisGang(member)) {
            command.reply({
                content: "Sorry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.",
                ephemeral: true
            });
        }

        const pingVoteMap = getPingVoteMap(command.message.id);
        pingVoteMap.add(member.id);
        const amount = pingVoteMap.size;
        const now = Date.now();
        if (isModMessage || (amount >= config.bot_settings.woisping_threshold)) {
            const reason = reasons[command.message.id];
            lastPing = now;
            await command.channel!.send(getMessage(reason, [...pingVoteMap]));
            return command.update({content: " Woisping ist durch", components: []});
        }
        return command.reply({
            content: " Jetzt müssen nur die anderen Bock drauf haben.",
            ephemeral: true
        });
    }
}

export const description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
