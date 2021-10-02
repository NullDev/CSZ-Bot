import Stempel from "../../storage/model/Stempel";

/**
 * Moderader können User stempeln, die andere User eingeladen haben
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    if (args.length < 2) return "Du musst schon User angeben!";
    if (message.mentions.users.size !== 2) return "Du hast entweder zu viele oder zu wenige User angegeben Bruder";

    let invitator = message.mentions.users.first();
    let invitedMember = message.mentions.users.last();

    if (!invitator || !invitedMember) return "Irgendwas stimmt mit deinen Usern nicht, check das mal ab!";

    let isNewInvite = await Stempel.insertStempel(invitator.id, invitedMember.id);

    return isNewInvite
        ? `Der Bruder ${invitator.username} hat den neuen Bruder ${invitedMember.username} eingeladen und du hast dies so eben bestätigt!`
        : `Der Bruder ${invitedMember.username} wurde bereits gestempelt!`;
};

export const description = `Stempelkarten für Jeden! Mit ~stempeln @invitator @invitedMember kannst du ab sofort User stempeln! Der erste User ist dabei der,
                        der einen anderen User eingeladen hat und der zweite User ist der, der eingeladen wurde! `;
