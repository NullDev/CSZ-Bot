import {
    Client, CommandInteraction, Guild,
    TextBasedChannel,
    parseEmoji,
    SlashCommandBuilder, SlashCommandStringOption
} from "discord.js";

import { isEmotifizierer, isMod } from "../utils/userUtils.js";
import { ApplicationCommand, MessageCommand } from "./command.js";
import { ProcessableMessage } from "../handler/cmdHandler.js";

/**
 * Sends instructions on how to ask better questions
 */
export class YoinkCommand implements MessageCommand, ApplicationCommand {
    readonly description = "Klaut emotes";
    readonly name = "yoink";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(new SlashCommandStringOption()
            .setName("emote")
            .setDescription("Emote")
            .setRequired(true)
        )
        .addStringOption(new SlashCommandStringOption()
            .setName("name")
            .setDescription("name")
            .setRequired(false)
        );

    async handleInteraction(command: CommandInteraction, _client: Client): Promise<void> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const author = command.guild?.members.cache.get(command.member!.user.id)!;
        if (!isEmotifizierer(author) && !isMod(author)) {
            await command.reply("Bist nicht cool genug");
            return;
        }
        const emote = command.options.getString("emote", true);
        const name = command.options.getString("name", false);
        const s = await this.createEmote(emote, command.channel!, name, command.guild!);
        await command.reply(s);
        return;
    }

    async handleMessage(message: ProcessableMessage, _client: Client): Promise<void> {
        // parse options
        const guildMember = message.guild.members.cache.get(message.member!.user.id)!;
        if (!isEmotifizierer(guildMember) && !isMod(guildMember)) {
            await message.channel.send("Bist nicht cool genug");
            return;
        }

        const args = message.content.split(" ");
        if (args.length >= 1) {
            await this.createEmote(args[1], message.channel, args.length >= 2 ? args[1] : null, message.guild);
            await message.delete();
        }
        else {
            await message.channel.send("Argumente musst du schon angeben, du Mongo");
            return;
        }
    }


    async createEmote(emoji: string, _channel: TextBasedChannel, name: string | null, guild: Guild): Promise<string> {
        const parsedEmoji = parseEmoji(emoji);
        if (!parsedEmoji) {
            return "Du Lellek, ich kann dein Emote nicht parsen";
        }

        const extension = parsedEmoji.animated ? ".gif" : ".png";
        const guildEmoji = await guild?.emojis.create({
            attachment: `https://cdn.discordapp.com/emojis/${parsedEmoji.id}` + extension,
            name: name ?? parsedEmoji.name
        });

        return `Hab \<:${guildEmoji.name}:${guildEmoji.id}\> als \`${guildEmoji.name}\` hinzugefügt`;
    }
}

export const description = "Klaut emotes";
