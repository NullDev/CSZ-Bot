import { MessageEmbed, User } from "discord.js";
import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition, ReplyInteraction } from "../types";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

function transform(c: string) {
    if (c === "ß" || c === "ẞ") return c;
    return Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase();
};

function mock(str: string): string {
    return str.split("").map(transform).join("");
}

function createMockEmbed(author: User, str: string): MessageEmbed {
    return new MessageEmbed()
        .setDescription(`${str} <:mock:677504337769005096>`)
        .setAuthor(`${author.username}`, author.displayAvatarURL())
        .setColor(0xa84300);
};

function mockify(user: User, text: string) {
    if (!text) {
        return { content: "Brudi da ist nix, was ich mocken kann" }
    }

    const content = createMockEmbed(user, mock(text));

    return { embeds: [content] };
}

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    const text = interaction.options.get("text")?.value as string;
    return mockify(interaction.user, mock(text));
}

async function replyHandler(replyInteraction: ReplyInteraction): Promise<Result> {
    const text = replyInteraction.referencedMsg.content;
    return mockify(replyInteraction.user, mock(text));
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        replyHandler,
        data: {
            name: "mock",
            description: "Mockt einen Text",
            options: [
                {
                    name: "text",
                    description: "DeR zU MoCkEnDe TeXt",
                    type: "STRING",
                    required: true
                }
            ]
        },
    }
];
