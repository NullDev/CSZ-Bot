import type { User } from "discord.js";

import db from "@db";

import * as ehre from "@/storage/ehre.js";

export async function addEhre(thankingUser: User, ehrenbruder: User): Promise<string> {
    if (thankingUser.id === ehrenbruder.id) {
        await ehre.removeEhrePoints(ehrenbruder);
        return "Willst dich selber ähren? Dreckiger Abschaum. Sowas verdient einfach keinen Respekt!";
    }

    if (await ehre.hasVoted(thankingUser.id)) {
        return "Ey, Einmal pro tag. Nicht gierig werden";
    }

    await ehre.addVote(thankingUser.id, ehrenbruder.id);
    return `${thankingUser} hat ${ehrenbruder} geährt`;
}

