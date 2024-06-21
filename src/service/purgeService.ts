import type { BotContext } from "../context.js";

import log from "@log";

export async function leetTask(context: BotContext) {
    const { hauptchat } = context.textChannels;
    const csz = context.guild;

    await hauptchat.send(
        "Es ist `13:37` meine Kerle.\nBleibt hydriert! :grin: :sweat_drops:",
    );

    // Auto-kick members
    const sadPinguEmote = csz.emojis.cache.find(e => e.name === "sadpingu");
    const dabEmote = csz.emojis.cache.find(e => e.name === "Dab");

    const membersToKick = (await csz.members.fetch())
        .filter(
            m =>
                m.joinedTimestamp !== null &&
                Date.now() - m.joinedTimestamp >= 48 * 3_600_000,
        )
        .filter(
            m => m.roles.cache.filter(r => r.name !== "@everyone").size === 0,
        );

    log.info(
        `Identified ${
            membersToKick.size
        } members that should be kicked, these are: ${membersToKick
            .map(m => m.displayName)
            .join(",")}.`,
    );

    if (membersToKick.size === 0) {
        await hauptchat.send(
            `Heute leider keine Jocklerinos gekickt ${sadPinguEmote}`,
        );
        return;
    }

    // We don't have trust in this code, so ensure that we don't kick any regular members :harold:
    if (membersToKick.size > 5) {
        // I think we don't need to kick more than 5 members at a time. If so, it is probably a bug and we don't want to to do that
        throw new Error(
            `You probably didn't want to kick ${membersToKick.size} members, or?`,
        );
    }

    // I don't have trust in this code, so ensure that we don't kick any regular members :harold:
    console.assert(
        false,
        membersToKick.some(m => m.roles.cache.some(r => r.name === "Nerd")),
    );

    const fetchedMembers = await Promise.all(membersToKick.map(m => m.fetch()));
    if (fetchedMembers.some(m => m.roles.cache.some(r => r.name === "Nerd"))) {
        throw new Error(
            "There were members that had the nerd role assigned. You probably didn't want to kick them.",
        );
    }

    await Promise.all([...membersToKick.map(member => member.kick())]);

    await hauptchat.send(
        `Hab grad ${membersToKick.size} Jocklerinos gekickt ${dabEmote}`,
    );

    log.info(`Auto-kick: ${membersToKick.size} members kicked.`);
}
