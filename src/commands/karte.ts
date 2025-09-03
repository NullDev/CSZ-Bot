import fs from "node:fs/promises";

import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type CacheType,
    type CommandInteraction,
    ComponentType,
    SlashCommandBuilder,
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

export default class KarteCommand implements ApplicationCommand {
    name = "karte";
    description = "Karte, damit du nicht verloren gehst";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction<CacheType>, context: BotContext) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const author = command.member;
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        for (const directionRow of allDirections) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (const direction of directionRow) {
                const button = new ButtonBuilder()
                    .setCustomId(`karte-direction-${direction}`)
                    .setLabel(direction) // TODO: Maybe use an emoji for that?
                    .setStyle(direction === "X" ? ButtonStyle.Danger : ButtonStyle.Secondary);

                row.addComponents(button);
            }
            rows.push(row);
        }

        const map = await this.buildMap(
            (await locationService.getPositionForUser(author.user as User)) ??
                locationService.startPosition,
            command.user,
            context,
        );

        const sentReply = await command.reply({
            fetchReply: true,
            embeds: [
                {
                    title: "Karte des heiligen CSZ-Landes",
                    color: 0x00ff00,
                    image: {
                        url: "attachment://map.png",
                    },
                },
            ],
            components: rows,
            files: [
                {
                    name: "map.png",
                    attachment: map,
                },
            ],
        });

        const collector = sentReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 45_000,
            filter: i => i.customId.startsWith("karte-direction-"),
        });

        collector.on("collect", async i => {
            const playerpos = await locationService.move(
                i.user,
                i.customId.valueOf().replace("karte-direction-", "") as locationService.Direction,
            );
            await i.message.edit({
                files: [
                    {
                        name: "Karte.png",
                        attachment: await this.buildMap(playerpos, i.user, context),
                    },
                ],
            });
            await i.deferUpdate();
        });

        collector.on("dispose", async i => {
            await i.deleteReply("@original");
        });
    }

    private async buildMap(
        position: locationService.Position,
        user: User,
        context: BotContext,
    ): Promise<Buffer> {
        const background = await fs.readFile("assets/maps/csz-karte-v1.png");
        const backgroundImage = await loadImage(background);
        const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(backgroundImage, 0, 0);

        const allPostions = await locationService.getAllCurrentPostions();
        for (const pos of allPostions) {
            const member = context.guild.members.cache.find(m => m.id === pos.userId);
            if (member && pos.userId !== user.id) {
                await this.drawPlayer(ctx, pos, member.user, "small");
            }
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
            position.x * stepfactor + radius,
            position.y * stepfactor + radius,
            radius,
            0,
            2 * Math.PI,
        );
        ctx.stroke();

        const _textMetrics = ctx.measureText(user.id);
        //Todo here funny pixelcounting to center the text
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;

        ctx.strokeText(
            user.displayName,
            position.x * stepfactor,
            position.y * stepfactor + (size === "large" ? 75 : 40),
        );
        const avatarURL = user.avatarURL({
            size: size === "large" ? 64 : 32,
        });
        // biome-ignore lint/style/noNonNullAssertion: :shrug:
        const avatar = await loadImage(avatarURL!);
        ctx.save();
        ctx.beginPath();
        ctx.arc(
            position.x * stepfactor + radius,
            position.y * stepfactor + radius,
            radius,
            0,
            2 * Math.PI,
        );
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatar, position.x * stepfactor, position.y * stepfactor);
        ctx.restore();
    }
}

const stepfactor = 32;
