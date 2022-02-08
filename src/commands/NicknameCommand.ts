import {SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandUserOption} from "@discordjs/builders";
import {CommandInteraction, Client, GuildMember} from "discord.js";

import {ApplicationCommand, CommandPermission, CommandResult} from "./command";
import {getConfig} from "../utils/configHandler";
import Nicknames from "../storage/model/Nicknames";

const config = getConfig();

export class NicknameCommand implements ApplicationCommand {
    modCommand: boolean = false;
    name: string = "nickname";
    description: string = "Setzt Nicknames für einen User";
    permissions: readonly CommandPermission[] = [
        {
            id: config.bot_settings.moderator_id,
            permission: true,
            type: "ROLE"
        },
        {
            id: config.ids.trusted_role_id,
            permission: true,
            type: "ROLE"
        }];

    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(
                new SlashCommandSubcommandBuilder()
                    .setName("add")
                    .setDescription("Fügt einen nickname hinzu brudi")
                    .addUserOption(new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst"))
                    .addStringOption(new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("nickname")
                        .setDescription("Was du tun willst")
                    ))
            .addSubcommand(
                new SlashCommandSubcommandBuilder()
                    .setName("delete")
                    .setDescription("Entfernt einen nickname brudi")
                    .addUserOption(new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst"))
                    .addStringOption(new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("nickname")
                        .setDescription("Was du tun willst")
                    ))
            .addSubcommand(
                new SlashCommandSubcommandBuilder()
                    .setName("deleteall")
                    .setDescription("Entfernt alle nickname brudi")
                    .addUserOption(new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst")));
    }

    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<CommandResult> {
        try {
            const option = command.options.getSubcommand();
            const nickname = command.options.getString("nickname", false);
            const user = command.guild?.members.cache.find(m => m.id === command.options.getUser("user", true).id);
            const commandUser = command.guild?.members.cache.find(m => m.id === command.user.id);

            if (!commandUser?.roles.cache.has(config.ids.trusted_role_id)) {
                return command.reply("Hurensohn. Der Command ist nix für dich.");
            }
            const userToUse = (user !== null) ? user : commandUser;


            if (option === "deleteall") {
                Nicknames.deleteNickNames(userToUse?.id);
                this.updateNickName(userToUse!, null);
                return command.reply("Ok Brudi. Hab alles gelöscht");
            }
            if (nickname === null) {
                return command.reply("Du musst schon n Nickname angeben");
            }
            if (option === "add") {
                await Nicknames.insertNickname(userToUse!.id, nickname);
                await this.updateNickName(userToUse!, nickname);
                return command.reply(`Ok Brudi. Hab für ${userToUse?.user} ${nickname} hinzugefügt`);
            }
            if (option === "delete") {
                await Nicknames.deleteNickName(userToUse!.id, nickname);
                return command.reply(`Ok Brudi. Hab für ${userToUse?.user} ${nickname} gelöscht`);
            }
            return command.reply("Das hätte nie passieren dürfen");
        }
        catch (e) {
            console.log(e);
            return command.reply("Das hätte nie passieren dürfen");
        }
    }

    async updateNickName(user: GuildMember, nickname: string | null) {
        await user.setNickname(nickname);
    }
}
