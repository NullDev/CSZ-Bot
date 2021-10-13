import { createCanvas, loadImage } from "canvas";
import { promises as fs } from "fs";
import { AllowedImageSize, GuildMember, Snowflake } from "discord.js";

import type { CommandFunction } from "../types";
import Stempel from "../storage/model/Stempel";
import * as log from "../utils/logger";

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
    { x: 312, y: 190 }
];

const getAvatarUrlForMember = (member?: GuildMember, size: AllowedImageSize = 32) => {
    return member?.user.avatarURL({
        size,
        dynamic: false,
        format: "png"
    }) ?? undefined;
};

const drawStempelkarteBackside = async(avatars: ReadonlyArray<string | undefined>) => {
    console.assert(avatars.length <= 10, "TODO: Implement multiple pages by batching avatars by 10");

    const avatarUnavailable = await fs.readFile("assets/no-avatar.png");
    const avatarUnavailableImage = await loadImage(avatarUnavailable);

    const background = await fs.readFile("assets/stempelkarte-back.png");
    const backgroundImage = await loadImage(background);

    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = canvas.getContext("2d");

    const avatarSourcesWithPlaceholders = avatars.map(url => url ? loadImage(url) : Promise.reject());

    const avatarResults = await Promise.allSettled(avatarSourcesWithPlaceholders);

    ctx.drawImage(backgroundImage, 0, 0);

    for (let i = 0; i < avatarResults.length; ++i) {
        const imageFetchResult = avatarResults[i];

        const avatar = imageFetchResult.status === "fulfilled"
            ? imageFetchResult.value
            : avatarUnavailableImage;

        const centerPoint = stempelLocations[i];
        ctx.drawImage(
            avatar,
            centerPoint.x - avatar.width / 2,
            centerPoint.y - avatar.height / 2
        );
    }

    return canvas.toBuffer();
};

export const run: CommandFunction = async(client, message, args) => {
    const ofUser = message.mentions.members?.first() ?? message.member;
    if (ofUser === null) {
        return;
    }

    const getUserById = (id: Snowflake) => message.guild?.members.cache.find(member => member.id === id);

    const invitees = await Stempel.getStempelByInvitator(ofUser.id);

    const avatarUrls = invitees
        .map(s => s.invitedMember)
        .map(getUserById)
        .map(member => getAvatarUrlForMember(member));

    const stempelkarte = await drawStempelkarteBackside(avatarUrls);

    try {
        await message.reply({
            files: [{
                attachment: stempelkarte,
                name: `stempelkarte-${ofUser.nickname}.png`
            }]
        });
    }
    catch (err) {
        log.error(`Could not create where meme: ${err}`);
    }
};

export const description = "Zeigt eine die Stempelkarte eines Users an.";
