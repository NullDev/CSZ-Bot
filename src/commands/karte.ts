import * as fs from "node:fs/promises";

import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
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
    TextDisplayBuilder,
    type User,
} from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";
import * as locationService from "@/service/location.js";
import type { BotContext } from "@/context.js";

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
    ) {
        const mapFile = new AttachmentBuilder(map, { name: "map.png" });

        const navigationButtons = this.#createNavigationButtonRow(currentPosition, mapSize);

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
            )
            .addActionRowComponents(navigationButtons);

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

        const map = await this.drawMap(currentPosition, command.user, context);

        const mapSize = {
            x: 1521,
            y: 782,
        };

        const messageData = await this.createMessageData(map, currentPosition, mapSize);

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
            filter: i => i.customId.startsWith("karte-direction-") && i.user.id === command.user.id,
        });

        collector.on("collect", async i => {
            const currentPosition = await locationService.move(
                i.user,
                i.customId.replace("karte-direction-", "") as locationService.Direction,
            );

            const map = await this.drawMap(currentPosition, i.user, context);

            const newMessageData = await this.createMessageData(map, currentPosition, mapSize);

            await i.message.edit({ ...newMessageData });
            await i.deferUpdate();
        });

        collector.on("dispose", async i => {
            await i.message.edit({
                components: [],
            });
        });
    }

    private async drawMap(
        position: locationService.Position,
        user: User,
        context: BotContext,
    ): Promise<Buffer> {
        const background = await fs.readFile("assets/maps/csz-karte-v1.png");
        const backgroundImage = await loadImage(background);

        const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(backgroundImage, 0, 0);

        const allPlayerLocations = await locationService.getAllCurrentPostions();
        for (const pos of allPlayerLocations) {
            if (pos.userId === user.id) {
                // Make sure we draw us last
                continue;
            }

            const member = context.guild.members.cache.find(m => m.id === pos.userId);
            if (!member) {
                continue;
            }

            await this.drawPlayer(ctx, pos, member.user, "small");
        }

        await this.drawPlayer(ctx, position, user, "large");
        return canvas.toBuffer("image/png");
    }

    private async drawPlayer(
        ctx: SKRSContext2D,
        position: locationService.Position,
        user: User,
        size: "small" | "large",
    ) {
        ctx.beginPath();
        ctx.strokeStyle = size === "large" ? "blue" : "grey";
        ctx.lineWidth = size === "large" ? 3 : 1;

        const radius = size === "large" ? 32 : 16;
        ctx.arc(
            position.x * stepSize + radius,
            position.y * stepSize + radius,
            radius,
            0,
            2 * Math.PI,
        );
        ctx.stroke();

        const _textMetrics = ctx.measureText(user.id);
        // TODO here funny pixelcounting to center the text
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;

        ctx.strokeText(
            user.displayName,
            position.x * stepSize,
            position.y * stepSize + (size === "large" ? 75 : 40),
        );

        const avatarURL = user.avatarURL({
            size: size === "large" ? 64 : 32,
        });

        if (!avatarURL) {
            return;
        }

        const avatar = await loadImage(avatarURL);

        ctx.save();
        ctx.beginPath();
        ctx.arc(
            position.x * stepSize + radius,
            position.y * stepSize + radius,
            radius,
            0,
            2 * Math.PI,
        );
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatar, position.x * stepSize, position.y * stepSize);
        ctx.restore();
    }
}

const stepSize = 32;
