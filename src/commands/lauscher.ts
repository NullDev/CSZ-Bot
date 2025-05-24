import {
    type CommandInteraction,
    type CacheType,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandBooleanOption,
    type User,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import assertNever from "@/utils/assertNever.js";
import { getPlaybackStats, setUserRegistration, type TrackStat } from "@/service/lauscher.js";
import { Temporal } from "@js-temporal/polyfill";
import { truncateToLength } from "@/utils/stringUtils.js";
import {
    type Canvas,
    createCanvas,
    GlobalFonts,
    loadImage,
    type CanvasTextBaseline,
    type CanvasTextAlign,
    type Image,
} from "@napi-rs/canvas";
import { chunkArray } from "@/utils/arrayUtils.js";
import { Vec2 } from "@/utils/math.js";

type SubCommand = "aktivierung" | "stats";

const intervals = {
    last_week: Temporal.Duration.from({ weeks: 1 }),
    last_month: Temporal.Duration.from({ months: 1 }),
    last_3_months: Temporal.Duration.from({ months: 3 }),
    last_6_months: Temporal.Duration.from({ months: 6 }),
    last_year: Temporal.Duration.from({ years: 1 }),
    all_time: Temporal.Duration.from({ years: 100 }),
};

GlobalFonts.registerFromPath("assets/fonts/OpenSans-VariableFont_wdth,wght.ttf", "Open Sans");
GlobalFonts.registerFromPath("assets/fonts/AppleColorEmoji@2x.ttf", "Apple Emoji");

const placeSymbols: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
};

interface TrackWithCover extends TrackStat {
    cover: Image;
    place: number;
    formattedArtists: string;
}

const fallbackCoverImage = await loadImage("assets/lauscher/fallback.png");

async function drawTrackToplistCanvas(_user: User, tracks: TrackWithCover[]): Promise<Canvas> {
    const imageSize = new Vec2(1024, 1024);

    const canvas = createCanvas(imageSize.x, imageSize.y);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";

    ctx.save();

    const imagePadding = new Vec2(16, 16);
    const entryOrigin = new Vec2(imagePadding.x, imagePadding.y);
    const entrySize = new Vec2(imageSize.x - imagePadding.x * 2, 64);

    const entryListPadding = 16;
    const entryOffset = new Vec2(0, entrySize.y + entryListPadding);
    for (let i = 0; i < tracks.length; ++i) {
        const entryPos = entryOrigin.add(entryOffset.scale(i));
        drawTrackEntry(entryPos, entrySize, tracks[i]);
    }

    ctx.restore();

    return canvas;

    function drawTrackEntry(pos: Vec2, size: Vec2, entry: TrackWithCover) {
        ctx.save();

        // make the positions of the track entry the origin of this entry,
        // so we don't have to compute global offsets
        ctx.translate(pos.x, pos.y);

        // |64px place | 64px cover | 16px padding | rest |
        // |------------1000x64---------------------------|
        const placeSize = new Vec2(64, 64);
        const coverSize = new Vec2(64, 64);
        const restLeftPadding = 16;

        const placePos = new Vec2(0, 0);
        const coverPos = placePos.add(placeSize.withY(0));
        const restPos = coverPos.add(coverSize.withY(0)).add(new Vec2(restLeftPadding, 0));
        const restSize = size.minus(restPos);

        if (entry.place <= 3) {
            const emoji = placeSymbols[entry.place];
            drawEmojiCentered(30, placePos.add(placeSize.divide(2)), emoji);
        } else {
            drawTextCentered(30, placePos.add(placeSize.divide(2)), entry.place.toString());
        }

        drawImage(coverPos, coverSize, entry.cover);

        const textAlignmentLine = restPos.withY(restPos.y + restSize.y * 0.3);
        drawText(
            textAlignmentLine,
            "left",
            "bottom",
            "#7f7f7f",
            "16px Open Sans",
            entry.formattedArtists,
        );
        drawText(textAlignmentLine, "left", "top", "#ffffff", "30px Open Sans", entry.name);

        const restMiddleLineStart = restPos.withY(restPos.y + restSize.y / 2);
        drawText(
            restMiddleLineStart.add(restSize.withY(0)),
            "right",
            "middle",
            "#ffffff",
            "30px Open Sans",
            "10x",
        );

        ctx.restore();
    }

    function drawImage(pos: Vec2, size: Vec2, image: Image) {
        ctx.drawImage(image, pos.x, pos.y, size.x, size.y);
    }
    function drawEmojiCentered(sizePx: number, centerPos: Vec2, symbol: string) {
        drawText(centerPos, "center", "middle", "#fff", `${sizePx}px Apple Emoji`, symbol);
    }
    function drawTextCentered(sizePx: number, centerPos: Vec2, text: string) {
        drawText(centerPos, "center", "middle", "#fff", `bold ${sizePx}px Open Sans`, text);
    }
    function drawText(
        pos: Vec2,
        textAlign: CanvasTextAlign,
        baseLine: CanvasTextBaseline,
        color: string,
        font: string,
        text: string,
    ) {
        ctx.save();
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = textAlign;
        ctx.textBaseline = baseLine;
        ctx.fillText(text, pos.x, pos.y);
        ctx.restore();
    }

    /*
    for (let i = 0; i < 10; i++) {
        const track = tracks[i];
        if (!track) {
            continue;
        }

        const artists = track.formattedArtists;
        const artistStr = truncateToLength(artists, 50);
        const trackStr = truncateToLength(track.name, 50);

        const placeSymbol = placeSymbols[track.place];
        if (placeSymbol) {
            const size = 60 - i * 5;
            ctx.font = `${size}px Apple Emoji`;
            ctx.textAlign = "left";
            ctx.fillText(placeSymbol, 5, 80 + i * 98);
        } else {
            ctx.font = "bold 30px Open Sans";
            ctx.textAlign = "left";
            ctx.fillText(track.place.toString(), 20, 55 + i * entrySize.height);
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

        ctx.drawImage(
            track.cover,
            80,
            15 + i * entrySize.height,
            coverSize.width,
            coverSize.height,
        );
    }
    return canvas;
    */
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

    async handleInteraction(command: CommandInteraction<CacheType>, _context: BotContext) {
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

                const tracksWithCover = await Promise.all(
                    topTenTracks.map(async (track, index) => {
                        const imageUrl = track.imageUrl?.trim();
                        return {
                            ...track,
                            formattedArtists: track.artists.map(a => a.name).join(", "),
                            place: index + 1,
                            cover: imageUrl ? await loadImage(imageUrl) : fallbackCoverImage,
                        };
                    }),
                );

                const canvas = await drawTrackToplistCanvas(user, tracksWithCover);
                const attachment = canvas.toBuffer("image/png");

                const buttons = chunkArray(
                    buildTrackToplistLinkButtons(placeSymbols, topTenTracks),
                    5,
                ).map(buttons => new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

                await command.reply({
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
