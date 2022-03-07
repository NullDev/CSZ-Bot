import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, Client, GuildMember } from "discord.js";

import { ApplicationCommand, CommandPermission, CommandResult } from "./command";
import { getConfig } from "../utils/configHandler";
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
                    .setDescription("Entfernt alle nicknames brudi*in")
                    .addUserOption(new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst")))
            .addSubcommand(
                new SlashCommandSubcommandBuilder()
                    .setName("list")
                    .setDescription("Zeigt alle nicknames brudi*in")
                    .addUserOption(new SlashCommandUserOption()
                        .setRequired(true)
                        .setName("user")
                        .setDescription("Wem du tun willst")));
    }

    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<CommandResult> {
        try {
            const option = command.options.getSubcommand();
            const commandUser = command.guild?.members.cache.find(m => m.id === command.user.id)!;
            // We know that the user option is in every subcommand.
            const user = command.options.getUser("user", true);

            if (!commandUser.roles.cache.has(config.ids.trusted_role_id)) {
                return command.reply("Hurensohn*in. Der Command ist nix für dich.");
            }

            // Yes, we could use a switch-statement here. No, that wouldn't make the code more readable as we're than
            // struggling with the nickname parameter which is mandatory only in "add" and "delete" commands.
            // Yes, we could rearrange the code parts into separate functions. Feel free to do so.
            // Yes, "else" is uneccessary as we're returning in every block. However, I find the semantics more clear.
            if (option === "deleteall") {
                await Nicknames.deleteNickNames(user.id);
                const member = command.guild?.members.cache.get(user.id)!;
                await this.updateNickName(member, null);
                return command.reply("Ok Brudi*in. Hab alles gelöscht");
            }
            else if (option === "list") {
                const nicknames = await Nicknames.getNicknames(user.id);
                if(!nicknames || nicknames.length === 0) {
                    return command.reply("Ne Brudi*in für den hab ich keine nicknames");
                }
                return command.reply(`Hab für den Brudi*in folgende Nicknames:\n${nicknames.join(",")}`);
            }
            else if (option === "add") {
                const nickname = command.options.getString("nickname", true);
                try {
                    await Nicknames.insertNickname(user.id, nickname);
                }
                catch (error) {
                    return command.reply(`Würdest du Hurensohn*in aufpassen, wüsstest du, dass für ${user} '${nickname}' bereits existiert.`);
                }

                return command.reply(`Ok Brudi*in. Hab für ${user} ${nickname} hinzugefügt`);
            }
            else if (option === "delete") {
                // We don't violate the DRY principle, since we're referring to another subcommand object as in the "add" subcommand.
                // Code is equal but knowledge differs.
                const nickname = command.options.getString("nickname", true);
                await Nicknames.deleteNickName(user.id, nickname);
                return command.reply(`Ok Brudi*in. Hab für ${user} ${nickname} gelöscht`);
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
