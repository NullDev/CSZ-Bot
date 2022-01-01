import {SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption} from "@discordjs/builders";
import {CommandInteraction, Client, GuildMember} from "discord.js";

import {ApplicationCommand, CommandResult} from "./command";
import {getConfig} from "../utils/configHandler";
import Nicknames from "../storage/model/Nicknames";

const config = getConfig();

export class NicknameCommand implements ApplicationCommand {
    modCommand: boolean = false;
    name: string = "nickname";
    description: string = "Setzt Nicknames für einen User";

    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(new SlashCommandStringOption()
                .setRequired(true)
                .setName("option")
                .setDescription("Was du tun willst")
                .addChoice("add", "add")
                .addChoice("delete", "delete")
                .addChoice("deleteAll", "deleteAll")
            )
            .addUserOption(new SlashCommandUserOption()
                .setRequired(false)
                .setName("user")
                .setDescription("Was du tun willst")
            )
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(false)
                    .setName("nickname")
                    .setDescription("Was du tun willst")
            );
    }

    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<CommandResult> {
        try {
            const option = command.options.getString("option", true);
            const nickname = command.options.getString("nickname", false);
            const user = command.guild?.members.cache.find(m => m.id === command.options.getUser("user", true).id);
            const commandUser = command.guild?.members.cache.find(m => m.id === command.user.id);

            if (!commandUser?.roles.cache.has(config.ids.trusted_role_id)) {
                return command.reply("Hurensohn. Der Command ist nix für dich.");
            }
            const userToUse = (user !== null) ? user : commandUser;


            if (option === "deleteAll") {
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
