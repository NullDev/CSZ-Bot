import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, GuildMember, PermissionString } from "discord.js";
import { Message, Client } from "discord.js";
import Ban from "../../storage/model/Ban";
import { getConfig } from "../../utils/configHandler";
import { ApplicationCommand, CommandResult, MessageCommand } from "../command";
import { restoreRoles } from "./ban";

const config = getConfig();

const unban = async(member: GuildMember) => {
    if (member.roles.cache.some(r => r.id === config.ids.default_role_id)) return "Dieser User ist nicht gebannt du kek.";

    await Ban.remove(member.user);

    if (!await restoreRoles(member)) return "Eine der angegebenen Rollen für das bannen existiert nich.";
};

export class UnbanCommand implements ApplicationCommand, MessageCommand {
    name: string = "unban";
    description: string = "Joa, unbannt halt einen ne?";
    requiredPermissions: readonly PermissionString[] = [
        "BAN_MEMBERS"
    ];
    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setDefaultPermission(false)
            .addUserOption(new SlashCommandUserOption()
                .setRequired(true)
                .setName("user")
                .setDescription("Der, der gebannt werden soll"));
    }

    async handleInteraction(command: CommandInteraction, _client: Client<boolean>): Promise<CommandResult> {
        const user = command.options.getUser("user", true);

        const userAsGuildMember = command.guild?.members.resolve(user);
        if(!userAsGuildMember) {
            return command.reply({
                content: "Yo, der ist nicht auf dem Server",
                ephemeral: true
            });
        }

        const err = await unban(userAsGuildMember);

        if(err) {
            return command.reply({
                content: err,
                ephemeral: true
            });
        }

        return command.reply({
            content: "Yo bruder, hab ihn entbannt"
        });
    }
    async handleMessage(message: Message, _client: Client<boolean>): Promise<CommandResult> {
        const user = message.mentions.users.first();

        if(!user) {
            await message.reply("Bruder, gib doch einen User an.");
            return;
        }

        const userAsGuildMember = message.guild?.members.resolve(user);

        if(!userAsGuildMember) {
            await message.reply("Bruder, der ist nicht auf diesem Server.");
            return;
        }

        const err = await unban(userAsGuildMember);

        if(err) {
            await message.reply({
                content: err
            });
            return;
        }

        await message.reply("Yo bruder, hab ihn entbannt");
    }
}
