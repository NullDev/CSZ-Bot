import nodeCanvas from "canvas";
import { promises as fs } from "fs";
import { AllowedImageSize, Client, CommandInteraction, GuildMember, Snowflake } from "discord.js";

import Stempel from "../storage/model/Stempel";
import log from "../utils/logger";
import { ApplicationCommand, CommandResult } from "./command";
import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";

const { createCanvas, loadImage } = nodeCanvas;

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

const firmenstempelCenter = {
    x: 90,
    y: 155
};

const getAvatarUrlForMember = (member?: GuildMember, size: AllowedImageSize = 32) => {
    return member?.user.avatarURL({
        size,
        dynamic: false,
        format: "png"
    }) ?? undefined;
};

const drawStempelkarteBackside = async(subjectAvatarUrl: string | undefined, avatars: ReadonlyArray<string | undefined>) => {
    console.assert(avatars.length <= 10, "TODO: Implement multiple pages by batching avatars by 10");

    const avatarUnavailable = await fs.readFile("assets/no-avatar.png");
    const avatarUnavailableImage = await loadImage(avatarUnavailable);

    const background = await fs.readFile("assets/stempelkarte-back.png");
    const backgroundImage = await loadImage(background);

    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = canvas.getContext("2d");

    const avatarSourcesWithPlaceholders = avatars.map(
        url => url
            ? loadImage(url)
            : Promise.reject(new Error("url is falsy"))
    );

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

    const subjectAvatar = subjectAvatarUrl
        ? await loadImage(subjectAvatarUrl)
        : avatarUnavailableImage;

    ctx.drawImage(
        subjectAvatar,
        firmenstempelCenter.x - subjectAvatar.width / 2,
        firmenstempelCenter.y - subjectAvatar.height / 2
    );

    return canvas.toBuffer();
};

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    let index = 0;
    const arrayLength = array.length;
    const tempArray = [];

    for (index = 0; index < arrayLength; index += chunkSize) {
        const myChunk = array.slice(index, index + chunkSize);
        tempArray.push(myChunk);
    }

    return tempArray;
}


export class StempelkarteCommand implements ApplicationCommand {
    modCommand: boolean = false;
    name: string = "stempelkarte";
    description: string = "Zeigt eine die Stempelkarte eines Users an.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(new SlashCommandUserOption()
            .setRequired(false)
            .setName("user")
            .setDescription("Derjeniche, von dem du die Stempelkarte sehen möchtest")
        );

    async handleInteraction(command: CommandInteraction, _client: Client<boolean>): Promise<CommandResult> {
        const userOption = command.options.getUser("user") ?? command.user;

        const ofMember = command.guild?.members.cache.find(m => m.id === userOption.id);
        if (!ofMember) {
            return;
        }

        const getUserById = (id: Snowflake) => command.guild?.members.cache.find(member => member.id === id);

        const allInvitees = await Stempel.getStempelByInvitator(ofMember.id);

        const subjectAvatarUrl = getAvatarUrlForMember(ofMember, 64);

        const inviteesChunked = chunkArray(allInvitees, 10);

        const stempelkarten: Promise<Buffer>[] = [];

        for (const invitees of inviteesChunked) {
            const avatarUrls = invitees
                .map(s => s.invitedMember)
                .map(getUserById)
                .map(member => getAvatarUrlForMember(member));

            stempelkarten.push(drawStempelkarteBackside(subjectAvatarUrl, avatarUrls));
        }

        const results = (await Promise.allSettled(stempelkarten))
            .filter(result => result.status === "fulfilled") as PromiseFulfilledResult<Buffer>[];

        const attachements = results.map((result, index) => ({
            name: `stempelkarte-${ofMember.nickname}-${index}.png`,
            attachment: result.value
        }));

        try {
            await command.reply({
                files: attachements
            });
        }
        catch (err) {
            log.error("Could not send stempelkarten", err);
        }
    }
}
