import {
    type CommandInteraction,
    type CacheType,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandBooleanOption,
    Embed,
    EmbedBuilder,
    type APIEmbed,
} from "discord.js";

import type { ApplicationCommand, AutocompleteCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import assertNever from "@/utils/assertNever.js";
import { getPlaybackStats, setUserRegistration } from "@/service/scrobbler.js";
import { Temporal } from "@js-temporal/polyfill";
import { de } from "chrono-node";

type SubCommand = "aktivierung" | "stats";

const intervals = {
    last_week: Temporal.Duration.from({ weeks: 1 }),
    last_month: Temporal.Duration.from({ months: 1 }),
    last_3_months: Temporal.Duration.from({ months: 3 }),
    last_6_months: Temporal.Duration.from({ months: 6 }),
    last_year: Temporal.Duration.from({ years: 1 }),
    all_time: Temporal.Duration.from({ years: 100 }),
};

type ToplistEntry = {
    name: string;
    count: number;
};

function buildToplistEmbed(title: string, description: string, content: ToplistEntry[]): APIEmbed {
    const embed: APIEmbed = {
        title,
        description,
        color: 0x00b0f4,
    };

    const fields = content
        .slice(0, 10)
        .sort((a, b) => b.count - a.count)
        .map((e, idx) => ({
            name: `${idx + 1}. ${e.name} (${e.count}x gehört)`,
            value: "",
            inline: false,
        }));
    embed.fields = fields;

    return embed;
}

export default class Scrobble implements ApplicationCommand {
    name = "scrobble";
    description = "Hört dir zu, wie du Musik hörst";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("aktivierung")
                .setDescription("Aktiviert oder deaktiviert dich für's scrobblen")
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName("aktiv")
                        .setDescription("Soll ich dich aktivieren, bruder?"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("stats")
                .setDescription("Zeigt deine Scrobble Stats an")
                .addStringOption(option =>
                    option
                        .setName("zeitraum")
                        .setDescription("Zeigt die Stats für einen bestimmten Zeitraum an")
                        .setRequired(true)
                        .addChoices(
                            { name: "Letzte Woche", value: "last_week" },
                            { name: "Letzter Monat", value: "last_month" },
                            { name: "Letzte 3 Monate", value: "last_3_months" },
                            { name: "Letztes Halbjahr", value: "last_6_months" },
                            { name: "Letztes Jahr", value: "last_year" },
                            { name: "Immer", value: "all_time" },
                        ),
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Zeigt die Stats für einen anderen User an")
                        .setRequired(false),
                ),
        );

    async handleInteraction(command: CommandInteraction<CacheType>, context: BotContext) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const subCommand = command.options.getSubcommand() as SubCommand;

        switch (subCommand) {
            case "aktivierung": {
                const activated = command.options.getBoolean("aktiv", true);
                await setUserRegistration(command.user, activated);
                await command.reply({
                    content: "Hab ik gemacht, dicker",
                    ephemeral: true,
                });
                return;
            }
            case "stats": {
                const user = command.options.getUser("user", false) || command.user;
                const timePeriod = command.options.getString("zeitraum", true);
                const interval = intervals[timePeriod as keyof typeof intervals];
                if (!interval) {
                    await command.reply({
                        content: "Das ist kein gültiger Zeitraum, bruder",
                        ephemeral: true,
                    });
                    return;
                }

                const stats = await getPlaybackStats(user, interval);

                if (!stats || !stats?.tracks || stats.tracks.length === 0) {
                    await command.reply({
                        content: "Konnte keine Stats finden, bruder",
                        ephemeral: true,
                    });
                    return;
                }

                const titleEmbed = buildToplistEmbed(
                    `Top Spuren von ${user.username}`,
                    "Hier sind deine Top Spuren",
                    stats.tracks,
                );
                const artistEmbed = buildToplistEmbed(
                    `Top Künstler von ${user.username}`,
                    "Hier sind deine Top Künstler",
                    stats.artists,
                );

                await command.reply({
                    embeds: [titleEmebbed, artistEmbed],
                });
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }
}
