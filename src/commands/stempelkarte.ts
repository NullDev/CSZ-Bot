import * as fs from "node:fs/promises";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
    type ImageSize,
    type CommandInteraction,
    type GuildMember,
    type Snowflake,
    SlashCommandBuilder,
    SlashCommandUserOption,
    ChatInputCommandInteraction,
} from "discord.js";

import * as stempel from "../storage/stempel.js";
import log from "@log";
import type { ApplicationCommand } from "./command.js";
import { chunkArray } from "../utils/arrayUtils.js";

const stempelLocations = [
    // 1-3
    { x: 214, y: 38 },
    { x: 264, y: 38 },
    { x: 312, y: 38 },

    // 4-6
    { x: 214, y: 88 },
    { x: 264, y: 88 },
    { x: 312, y: 88 },

    // 7-9
    { x: 214, y: 140 },
    { x: 264, y: 140 },
    { x: 312, y: 140 },

    // 10
    { x: 312, y: 190 },
];

const firmenstempelCenter = {
    x: 90,
    y: 155,
};

const getAvatarUrlForMember = (member?: GuildMember, size: ImageSize = 32) => {
    return (
        member?.user.avatarURL({
            size,
            forceStatic: true,
            extension: "png",
        }) ?? undefined
    );
};

const drawStempelkarteBackside = async (
    subjectAvatarUrl: string | undefined,
    avatars: ReadonlyArray<string | undefined>,
) => {
    console.assert(
        avatars.length <= 10,
        "TODO: Implement multiple pages by batching avatars by 10",
    );

    const avatarUnavailable = await fs.readFile("assets/no-avatar.png");
    const avatarUnavailableImage = await loadImage(avatarUnavailable);

    const background = await fs.readFile("assets/stempelkarte/back.png");
    const backgroundImage = await loadImage(background);

    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = canvas.getContext("2d");

    const avatarSourcesWithPlaceholders = avatars.map(url =>
        url ? loadImage(url) : Promise.reject(new Error("url is falsy")),
    );

    const avatarResults = await Promise.allSettled(
        avatarSourcesWithPlaceholders,
    );

    ctx.drawImage(backgroundImage, 0, 0);

    for (let i = 0; i < avatarResults.length; ++i) {
        const imageFetchResult = avatarResults[i];

        const avatar =
            imageFetchResult.status === "fulfilled"
                ? imageFetchResult.value
                : avatarUnavailableImage;

        const centerPoint = stempelLocations[i];
        ctx.drawImage(
            avatar,
            centerPoint.x - avatar.width / 2,
            centerPoint.y - avatar.height / 2,
        );
    }

    const subjectAvatar = subjectAvatarUrl
        ? await loadImage(subjectAvatarUrl)
        : avatarUnavailableImage;

    ctx.drawImage(
        subjectAvatar,
        firmenstempelCenter.x - subjectAvatar.width / 2,
        firmenstempelCenter.y - subjectAvatar.height / 2,
    );

    return await canvas.encode("png");
};

export default class StempelkarteCommand implements ApplicationCommand {
    modCommand = false;
    name = "stempelkarte";
    description = "Zeigt eine die Stempelkarte eines Users an.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(
            new SlashCommandUserOption()
                .setRequired(false)
                .setName("user")
                .setDescription(
                    "Derjeniche, von dem du die Stempelkarte sehen möchtest",
                ),
        );

    async handleInteraction(command: CommandInteraction) {
        if (!(command instanceof ChatInputCommandInteraction)) {
            // TODO: handle this on a type level
            return;
        }

        const userOption = command.options.getUser("user") ?? command.user;

        const ofMember = command.guild?.members.cache.find(
            m => m.id === userOption.id,
        );
        if (!ofMember) {
            return;
        }

        const getUserById = (id: Snowflake) =>
            command.guild?.members.cache.find(member => member.id === id);

        const allInvitees = await stempel.getStempelByInvitator(ofMember);

        if (allInvitees.length === 0) {
            await command.reply({
                content:
                    "Wie wäre es wenn du überhaupt mal Leute einlädst du Schmarotzer",
            });
            return;
        }

        const subjectAvatarUrl = getAvatarUrlForMember(ofMember, 64);

        const inviteesChunked = chunkArray(allInvitees, 10);

        const stempelkarten: Promise<Buffer>[] = [];

        for (const invitees of inviteesChunked) {
            const avatarUrls = invitees
                .map(s => s.invitedMemberId)
                .map(getUserById)
                .map(member => getAvatarUrlForMember(member));

            stempelkarten.push(
                drawStempelkarteBackside(subjectAvatarUrl, avatarUrls),
            );
        }

        const results = (await Promise.allSettled(stempelkarten)).filter(
            result => result.status === "fulfilled",
        ) as PromiseFulfilledResult<Buffer>[];

        const files = results.map((result, index) => ({
            name: `stempelkarte/${ofMember.nickname}-${index}.png`,
            attachment: result.value,
        }));

        try {
            await command.reply({
                files,
            });
        } catch (err) {
            log.error(err, "Could not send stempelkarten");
        }
    }
}
