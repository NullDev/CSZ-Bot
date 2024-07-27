import { EmbedBuilder, type GuildMember } from "discord.js";

const INSPIRATION_GENERATE_API_URL = "https://inspirobot.me/api?generate=true";

async function getInspiration(): Promise<string> {
    const res = await fetch(INSPIRATION_GENERATE_API_URL, {
        method: "GET",
    });
    return await res.text();
}

export async function getInspirationsEmbed(author: GuildMember) {
    const inspiration = await getInspiration();
    return new EmbedBuilder()
        .setImage(inspiration)
        .setColor(0x26c723)
        .setTimestamp(new Date())
        .setAuthor({
            name: `${author.displayName} wurde erleuchtet`,
            iconURL: author.displayAvatarURL(),
        })
        .setFooter({
            text: "🙏 Glaub an dich 🙏",
        });
}
