// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Send the invite link to the person issuing the command
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    await message.author.send("Invite Link: https://discord.gg/csz");
    await message.react("✉"); // Only react when the message was actually sent
};

export const description = "Sendet einen Invite-Link für den Server";
