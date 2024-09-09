import type { GuildChannel, GuildMember, TextChannel } from "discord.js";

import type { BotContext } from "@/context.js";

import log from "@log";
import * as lootService from "@/service/loot.js";

export async function startAsseGuardShift(
    context: BotContext,
    member: GuildMember,
    announcementChannel: GuildChannel & TextChannel,
) {
    const currentGuards = context.roles.lootRoleAsseGuard.members;
    if (currentGuards.has(member.id)) {
        return;
    }

    for (const m of currentGuards.values()) {
        await m.roles.remove(context.roles.lootRoleAsseGuard);
    }
    await member.roles.add(context.roles.lootRoleAsseGuard);
    await announcementChannel.send({
        embeds: [
            {
                title: "Schichtbeginn",
                description: `Die Wärterschicht von ${member} am Eingang des Atommüllendlagers hat begonnen.\n\nGegen etwas Süßes lässt ${member} vielleicht ein Fass in der Grube verschwinden.`,
                color: 0x00ff00,
            },
        ],
    });
}

export async function checkExpiredShifts(context: BotContext) {
    const now = Date.now();

    const shiftDurationMs = context.commandConfig.loot.roles.asseGuardShiftDuration.milliseconds;

    const neededShiftStartTs = now - shiftDurationMs;

    const currentGuards = context.roles.lootRoleAsseGuard.members;
    for (const m of currentGuards.values()) {
        const drops = await lootService.getUserLootsById(
            m.user.id,
            lootService.LootTypeId.SCHICHTBEGINN_ASSE_2,
        );
        if (drops.length === 0) {
            await endAsseGuardShift(context, m);
            continue;
        }

        const allShiftsExpired = drops.every(
            d => new Date(d.createdAt).getTime() < neededShiftStartTs,
        );
        if (allShiftsExpired) {
            await endAsseGuardShift(context, m);
        }
    }
}

async function endAsseGuardShift(context: BotContext, member: GuildMember) {
    await member.roles.remove(context.roles.lootRoleAsseGuard);
}

export async function getCurrentAsseGuardOnDuty(context: BotContext) {
    const currentGuards = context.roles.lootRoleAsseGuard.members;
    if (currentGuards.size > 1) {
        log.warn({ guards: [...currentGuards.keys()] }, "More than one guard is currently on duty");
    }
    return currentGuards.first();
}
