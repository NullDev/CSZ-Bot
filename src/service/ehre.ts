import type { User } from "discord.js";

import * as ehre from "#storage/ehre.ts";

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

export async function getRanking() {
    return await ehre.getUserInGroups();
}

export async function hasVoted(user: User): Promise<boolean> {
    return await ehre.hasVoted(user.id);
}

const ehreFormatter = new Intl.NumberFormat("de-DE", {
    style: "decimal",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

export function formatPoints(points: number): string {
    return ehreFormatter.format(points * 10);
}
