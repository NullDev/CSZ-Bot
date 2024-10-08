import type { GuildChannel, GuildMember, TextChannel } from "discord.js";

import type { BotContext } from "@/context.js";

import { LootKindId } from "@/service/lootData.js";
import * as lootService from "@/service/loot.js";

import log from "@log";

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
        const drops = await lootService.getUserLootsByTypeId(
            m.user.id,
            LootKindId.SCHICHTBEGINN_ASSE_2,
        );
        log.info({ member: m.id, drops: drops.length }, "Checking AsseGuard shift");

        if (drops.length === 0) {
            log.info({ member: m.id }, "No drops found for AsseGuard shift");
            // await endAsseGuardShift(context, m);
            continue;
        }

        const allShiftsExpired = drops.every(
            d => new Date(d.createdAt).getTime() < neededShiftStartTs,
        );
        if (allShiftsExpired) {
            log.info({ member: m.id }, "All shifts expired for AsseGuard");
            // await endAsseGuardShift(context, m);
        }
    }
}

export async function endAsseGuardShift(context: BotContext, member: GuildMember) {
    log.info({ member: member.id }, "Ending AsseGuard shift");
    await member.roles.remove(context.roles.lootRoleAsseGuard);
}

export async function isInAsseGuardShift(context: BotContext, member: GuildMember) {
    return context.roles.lootRoleAsseGuard.members.has(member.id);
}

export async function getCurrentAsseGuardOnDuty(context: BotContext) {
    const currentGuards = context.roles.lootRoleAsseGuard.members;
    if (currentGuards.size > 1) {
        log.warn({ guards: [...currentGuards.keys()] }, "More than one guard is currently on duty");
    }
    return currentGuards.first();
}
