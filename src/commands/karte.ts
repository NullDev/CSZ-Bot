import * as fs from "node:fs/promises";

import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    type CacheType,
    type CommandInteraction,
    ComponentType,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandStringOption,
    TextDisplayBuilder,
    type User,
} from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";
import * as locationService from "@/service/location.js";
import type { BotContext } from "@/context.js";
import { Vec2, Vec4 } from "@/utils/math.js";
import * as fontService from "@/service/font.js";
import { extendContext, type ExtendedCanvasContext } from "@/utils/ExtendedCanvasContext.js";
import path from "node:path";

const allDirections = [
    ["NW", "N", "NE"],
    ["W", "X", "E"],
    ["SW", "S", "SE"],
] as const satisfies locationService.Direction[][];

const buttonLabels: Record<locationService.Direction, string> = {
    NW: "↖️",
    N: "⬆️",
    NE: "↗️",
    W: "⬅️",
    X: "_", // must not be empty
    E: "➡️",
    SW: "↙️",
    S: "⬇️",
    SE: "↘️",
};

export default class KarteCommand implements ApplicationCommand {
    name = "karte";
    description = "Karte, damit du nicht verloren gehst";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .addStringOption(
            new SlashCommandStringOption()
                .setDescription("Debug")
                .setRequired(false)
                .setName("debugchoice")
                .addChoices(
                    {
                        name: "Gridoverlay",
                        value: "GRID",
                    },
                    {
                        name: "LocationOverlay",
                        value: "LOCATIONS",
                    },
                ),
        )
        .setDescription(this.description);

    #createNavigationButtonRow(
        currentPosition: locationService.Position,
        mapSize: locationService.Position,
    ) {
        return allDirections.map(directionRow => {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (const direction of directionRow) {
                const canPress = locationService.canMove(currentPosition, mapSize, direction);
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`karte-direction-${direction}`)
                        .setLabel(buttonLabels[direction])
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!canPress),
                );
            }
            return row;
        });
    }

    async createMessageData(
        map: Buffer,
        currentPosition: locationService.Position,
        mapSize: locationService.Position,
        withNavigation: boolean,
    ) {
        const mapFile = new AttachmentBuilder(map, { name: "map.png" });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Karte des heiligen CSZ-Landes"),
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL("attachment://map.png")
                        .setDescription("Karte"),
                ),
            );

        if (withNavigation) {
            const navigationButtons = this.#createNavigationButtonRow(currentPosition, mapSize);
            container.addActionRowComponents(navigationButtons);
        }

        return {
            components: [container],
            files: [mapFile],
        };
    }

    async handleInteraction(command: CommandInteraction<CacheType>, context: BotContext) {
        if (!command.isChatInputCommand()) {
            return; // TODO: Solve this on a type level
        }

        const author = command.member;
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const currentPosition =
            (await locationService.getPositionForUser(author.user as User)) ??
            locationService.startPosition;
        const debugchoice = command.options.getString("debugchoice", false);
        const map = await this.#drawMap(debugchoice, currentPosition, command.user, context);

        const mapSize = {
            x: 1600,
            y: 800,
        };

        const messageData = await this.createMessageData(map, currentPosition, mapSize, true);

        const replyData = await command.reply({
            withResponse: true,
            flags: MessageFlags.IsComponentsV2,
            ...messageData,
        });

        const sentReply = replyData.resource?.message;
        if (sentReply === null || sentReply === undefined) {
            throw new Error("Expected message to be present.");
        }

        const collector = sentReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 45_000,
            filter: async i => {
                // Docs:
                // One important difference to note with interaction collectors is that Discord expects a response to all
                // interactions within 3 seconds - even ones that you don't want to collect.
                // For this reason, you may wish to .deferUpdate() all interactions in your filter,
                await i.deferUpdate();
                return i.customId.startsWith("karte-direction-") && i.user.id === command.user.id;
            },
        });

        collector.on("collect", async i => {
            const currentPosition = await locationService.move(
                i.user,
                i.customId.replace("karte-direction-", "") as locationService.Direction,
            );

            const map = await this.#drawMap(debugchoice, currentPosition, i.user, context);

            const newMessageData = await this.createMessageData(
                map,
                currentPosition,
                mapSize,
                true,
            );

            await i.message.edit({ ...newMessageData });
        });

        collector.on("end", async () => {
            const currentPosition =
                (await locationService.getPositionForUser(author.user as User)) ??
                locationService.startPosition;

            const map = await this.#drawMap(debugchoice, currentPosition, command.user, context);

            const newMessageData = await this.createMessageData(
                map,
                currentPosition,
                mapSize,
                false,
            );
            await sentReply.edit({ ...newMessageData });
        });
    }

    async #drawMap(
        debugchoice: string | null,
        position: locationService.Position,
        user: User,
        context: BotContext,
    ): Promise<Buffer> {
        const background = await fs.readFile("assets/maps/csz-karte-v1.png");
        const backgroundImage = await loadImage(background);

        const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
        const ctx = extendContext(canvas.getContext("2d"));

        ctx.drawImage(backgroundImage, 0, 0);
        if (debugchoice === "GRID") {
            this.#drawRaster(ctx);
        }
        if (debugchoice === "LOCATIONS") {
            this.#drawLocations(ctx);
        }

        const allPlayerLocations = await locationService.getAllCurrentPostions();
        for (const pos of allPlayerLocations) {
            if (pos.userId === user.id) {
                continue; // Make sure we draw us last
            }

            const member = context.guild.members.cache.find(m => m.id === pos.userId);
            if (!member) {
                continue;
            }

            const avatarUrl = member.user.avatarURL({ size: 64, forceStatic: true });
            if (!avatarUrl) {
                continue;
            }

            const avatar = await loadImage(avatarUrl);
            this.#drawPlayer(ctx, pos, member.user.displayName, avatar, "small", "grey");
        }

        const avatarUrl = user.avatarURL({ size: 64, forceStatic: true });
        if (!avatarUrl) {
            throw new Error("Could not fetch avatar of user.");
        }

        const avatar = await loadImage(avatarUrl);
        this.#drawPlayer(ctx, position, user.displayName, avatar, "large", "blue");

        return await canvas.encode("png");
    }

    #drawAvatar(
        ctx: ExtendedCanvasContext,
        position: locationService.Position,
        avatar: Image,
        radius: number,
        strokeWidth: number,
        strokeColor: string,
    ) {
        const pos = new Vec2(position.x, position.y);

        ctx.beginPath();
        ctx.circlePath(pos.scale(stepSize).minus(new Vec2(0, radius)), radius, "center", "top");

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        ctx.stroke();

        ctx.save();
        ctx.beginPath();

        ctx.circlePath(pos.scale(stepSize).minus(new Vec2(0, radius)), radius, "center", "top");

        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, position.x * stepSize - radius, position.y * stepSize - radius);
        ctx.restore();
    }

    #drawLocation(
        ctx: ExtendedCanvasContext,
        position: { name: string; x: number; y: number; width: number; height: number },
        strokeWidth: number,
        strokeColor: string,
    ) {
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.rect(
            position.x * stepSize,
            position.y * stepSize,
            position.width * stepSize,
            position.height * stepSize,
        );
        ctx.fillTextExtended(
            new Vec2(position.x * stepSize, position.y * stepSize + 10),
            "center",
            "top",
            strokeColor,
            "bold 20px",
            fontService.names.openSans,
            position.name,
        );

        ctx.stroke();
        ctx.save();
        ctx.restore();
    }

    #drawPlayer(
        ctx: ExtendedCanvasContext,
        position: locationService.Position,
        name: string,
        avatar: Image,
        size: "small" | "large",
        playerColor: "blue" | "grey",
    ) {
        const radius = size === "large" ? 32 : 16;

        ctx.fillTextExtended(
            new Vec2(position.x * stepSize, position.y * stepSize + radius),
            "center",
            "top",
            playerColor,
            "bold 20px",
            fontService.names.openSans,
            name,
        );

        this.#drawAvatar(ctx, position, avatar, radius, size === "large" ? 4 : 1, playerColor);
    }

    #drawRaster(ctx: ExtendedCanvasContext) {
        const size = new Vec2(1600, 800);

        // ctx.save();

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#a0a0a0";

        for (let x = 0; x < size.x; x += stepSize) {
            // ctx.save();

            if (x % 100 === 0) {
                ctx.lineWidth = 2;
            } else {
                ctx.lineWidth = 1;
            }

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size.y);
            ctx.stroke();

            // ctx.restore();
        }
        for (let y = 0; y < size.y; y += stepSize) {
            // ctx.save();

            if (y % 100 === 0) {
                ctx.lineWidth = 2;
            } else {
                ctx.lineWidth = 1;
            }

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size.x, y);
            ctx.stroke();

            // ctx.restore();
        }

        // ctx.restore();
    }

    async #drawLocations(ctx: ExtendedCanvasContext) {
        const locations: [
            {
                name: string;
                description: string;
                x: number;
                y: number;
                width: number;
                height: number;
                color: string;
            },
        ] = JSON.parse(await fs.readFile(path.resolve("assets/maps/locations.json"), "utf-8"));
        for (const location of locations) {
            this.#drawLocation(
                ctx,
                {
                    name: location.name,
                    x: location.x,
                    y: location.y,
                    height: location.height,
                    width: location.width,
                },
                2,
                location.color,
            );
        }
    }
}

const stepSize = 10;
