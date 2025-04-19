import {
    type CommandInteraction,
    type CacheType,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandBooleanOption,
    EmbedBuilder,
    type User,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} from "discord.js";

import type { ApplicationCommand, AutocompleteCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import assertNever from "@/utils/assertNever.js";
import { getPlaybackStats, setUserRegistration, type TrackStat } from "@/service/lauscher.js";
import { Temporal } from "@js-temporal/polyfill";
import { truncateToLength } from "@/utils/stringUtils.js";
import { type Canvas, createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { chunkArray } from "@/utils/arrayUtils.js";

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

GlobalFonts.registerFromPath("assets/fonts/OpenSans-VariableFont_wdth,wght.ttf", "Open Sans");
GlobalFonts.registerFromPath("assets/fonts/AppleColorEmoji@2x.ttf", "Apple Emoji");

const placeSymbols: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
};

async function drawTrackToplistCanvas(user: User, tracks: TrackStat[]): Promise<Canvas> {
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";

    const entrySize = {
        height: 100,
    };
    const coverSize = {
        width: 64,
        height: 64,
    };

    for (let i = 0; i < 10; i++) {
        const track = tracks[i];
        const place = i + 1;
        if (!track) {
            ctx.fillText(`${place}. nicht vorhanden`, 20, i * 50);
            continue;
        }

        const artists = track.artists.map(a => a.name).join(", ");
        const artistStr = truncateToLength(artists, 50);
        const trackStr = truncateToLength(track.name, 50);

        const placeSymbol = placeSymbols[place];
        if (placeSymbol) {
            const size = 60 - i * 5;
            ctx.font = `${size}px Apple Emoji`;
            ctx.textAlign = "left";
            ctx.fillText(placeSymbol, 5, 80 + i * 98);
        } else {
            ctx.font = "bold 30px Open Sans";
            ctx.textAlign = "left";
            ctx.fillText(place.toString(), 20, 55 + i * entrySize.height);
        }

        ctx.font = "16px Open Sans";
        ctx.textAlign = "left";
        ctx.fillStyle = "#7f7f7f";
        ctx.fillText(artistStr, 160, 35 + i * entrySize.height);

        ctx.font = "30px Open Sans";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(trackStr, 160, 70 + i * entrySize.height);

        ctx.textAlign = "right";
        ctx.fillText(`${track.count}x`, 1000, 55 + i * entrySize.height);

        const imageUrl =
            track.imageUrl && track.imageUrl.trim() !== ""
                ? track.imageUrl
                : "assets/images/fallback.png";

        ctx.drawImage(
            await loadImage(imageUrl),
            80,
            15 + i * entrySize.height,
            coverSize.width,
            coverSize.height,
        );
    }

    return canvas;
}

function buildTrackToplistLinkButtons(
    placeSymbols: Record<string, string>,
    tracks: TrackStat[],
): ButtonBuilder[] {
    return tracks.map((track, idx) => {
        const place = idx + 1;
        const button = new ButtonBuilder()
            .setLabel(placeSymbols[place] ?? place.toString())
            .setStyle(ButtonStyle.Link)
            .setURL(`https://open.spotify.com/track/${encodeURIComponent(track.trackId)}`);
        return button;
    });
}

export default class Lauscher implements ApplicationCommand {
    name = "lauscher";
    description = "Hört dir zu, wie du Musik hörst";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("aktivierung")
                .setDescription("Aktiviert oder deaktiviert dich für's lauschen")
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName("aktiv")
                        .setDescription("Soll ich dich aktivieren, bruder?"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("stats")
                .setDescription("Zeigt deine Lausch-Statistiken an")
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

                if (!stats?.tracks || stats.tracks.length === 0) {
                    await command.reply({
                        content: "Konnte keine Stats finden, bruder",
                        ephemeral: true,
                    });
                    return;
                }

                const topTenTracks = stats.tracks.sort((a, b) => b.count - a.count).slice(0, 10);

                const canvas = await drawTrackToplistCanvas(user, topTenTracks);
                const attachment = canvas.toBuffer("image/png");
                const image = new EmbedBuilder()
                    .setTitle("Top Spuren")
                    .setImage("attachment://top_tracks.png")
                    .setColor(0x00b0f4);

                const buttons = chunkArray(
                    buildTrackToplistLinkButtons(placeSymbols, topTenTracks),
                    5,
                ).map(buttons => new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

                await command.reply({
                    embeds: [image],
                    components: [...buttons],
                    files: [
                        {
                            name: "top_tracks.png",
                            attachment,
                        },
                    ],
                });
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }
}
