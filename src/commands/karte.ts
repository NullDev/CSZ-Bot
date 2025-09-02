import { ApplicationCommand } from "@/commands/command.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type CacheType,
    type CommandInteraction,
    ComponentType,
    SlashCommandBuilder,
    User,
} from "discord.js";
import fs from "node:fs/promises";
import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";
import { getAllPostions, getPositionForUser, MapPosition, move } from "@/storage/mapPosition.js";
import { BotContext } from "@/context.js";

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

        const author = command.guild?.members.resolve(command.user);

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const directions = [
            ["NW", "N", "NE"],
            ["W", "X", "E"],
            ["SW", "S", "SE"],
        ];

        const rows = [];
        for (const directionrow of directions) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (const direction of directionrow) {
                const button = new ButtonBuilder()
                    .setCustomId("map_" + direction)
                    .setLabel(direction);
                if (direction === "X") {
                    button.setStyle(ButtonStyle.Danger);
                } else {
                    button.setStyle(ButtonStyle.Secondary);
                }
                row.addComponents(button);
            }
            rows.push(row);
        }
        const map = await this.buildMap(await getPositionForUser(author.id), command.user, context);

        const sentReply = await command.reply({
            fetchReply: true,
            embeds: [
                {
                    title: `Karte des heiligen CSZ Landes`,
                    description: ``,
                    color: 0x00ff00,

                    image: {
                        url: `attachment://Karte.png`,
                    },
                },
            ],
            files: [
                {
                    name: "Karte.png",
                    attachment: map,
                },
            ],
            components: rows,
        });
        const collector = sentReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 45_000,
        });
        collector.on("collect", async i => {
            const playerpos = await move(
                i.user.id,
                i.customId.valueOf().replace("map_", "") as Direction,
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
        position: MapPosition,
        user: User,
        context: BotContext,
    ): Promise<Buffer> {
        const background = await fs.readFile("assets/maps/CSZ Karte V1.png");
        const backgroundImage = await loadImage(background);
        const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(backgroundImage, 0, 0);

        let allPostions = await getAllPostions();
        for (const pos of allPostions) {
            let member = context.guild.members.cache.find(m => m.id === pos.userid);
            if (member && pos.userid != user.id) {
                await this.drawPlayer(ctx, pos, member.user, "small");
            }
        }
        await this.drawPlayer(ctx, position, user, "large");
        return canvas.toBuffer("image/png");
    }

    private async drawPlayer(
        ctx: SKRSContext2D,
        position: MapPosition,
        user: User,
        size: "small" | "large",
    ) {
        ctx.beginPath();
        ctx.strokeStyle = size == "large" ? "blue" : "grey";
        ctx.lineWidth = size == "large" ? 3 : 1;
        const radius = size == "large" ? 32 : 16;
        ctx.arc(
            position.x * stepfactor + radius,
            position.y * stepfactor + radius,
            radius,
            0,
            2 * Math.PI,
        );
        ctx.stroke();
        let textMetrics = ctx.measureText(position.userid);
        //Todo here funny pixelcounting to center the text
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;

        ctx.strokeText(
            user.displayName,
            position.x * stepfactor,
            position.y * stepfactor + (size == "large" ? 75 : 40),
        );
        const avatarURL = user.avatarURL({
            size: size == "large" ? 64 : 32,
        });
        let avatar = await loadImage(avatarURL!);
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

export type Direction = "NW" | "N" | "NE" | "W" | "X" | "E" | "SW" | "S" | "SE";

const stepfactor = 32;
