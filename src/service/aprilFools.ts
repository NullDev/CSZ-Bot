import type { Collection, GuildMember, Role, Snowflake } from "discord.js";
import * as sentry from "@sentry/bun";

import type { BotContext } from "@/context.js";
import * as penis from "@/storage/penis.js";
import * as boob from "@/storage/boob.js";
import { shuffleArray } from "@/utils/arrayUtils.js";
import log from "@log";

// Store old usernames. Hope the bot doesn't crash lol
const tmpNicknameStore: Record<Snowflake, string> = {};
const colorfulRoles = {
    role_cyan: 0x00c09a,
    role_green: 0x00d166,
    role_blue: 0x0099e1,
    role_purple: 0xa652bb,
    role_pink: 0xfd0061,
    role_gelb: 0xf8c300,
    role_red: 0xf93a2f,
};

const verboslyGetPromiseSettledResults = <T>(
    descriptor: string,
    promises: PromiseSettledResult<T>[],
): T[] => {
    const rejected = promises.filter(p => p.status === "rejected");
    const fulfilled = promises.filter(p => p.status === "fulfilled");

    log.info(`[${descriptor}]: ${fulfilled.length} where successful. ${rejected.length} failed`);
    for (const rejection of rejected) {
        log.error(rejection, `[${descriptor}]: Failed because of: ${rejection.reason}`);
    }

    return fulfilled.map(p => p.value);
};

const renameMember = (member: GuildMember, name: string | null): Promise<GuildMember> =>
    member.setNickname(name, "April Fools").catch(err => {
        throw new Error(`Could not rename Member: ${member.id} to ${name} because of ${err}`);
    });

const resetAll = async (context: BotContext): Promise<PromiseSettledResult<GuildMember>[]> => {
    const allMembers = await context.guild.members.fetch();
    return Promise.allSettled(
        allMembers.map(member => renameMember(member, tmpNicknameStore[member.id] ?? null)),
    );
};

const createShuffledNicknames = async (
    members: Collection<Snowflake, GuildMember>,
): Promise<Record<Snowflake, string>> => {
    const shuffledNicknames: Record<Snowflake, string> = {};
    for (const [id, member] of members.entries()) {
        tmpNicknameStore[id] = member.displayName;
    }

    const averageCockSize = await penis.getAveragePenisSizes();
    const averageBoobSize = await boob.getAverageBoobSizes();

    const biasFnId = (id: Snowflake) =>
        Math.random() * (averageCockSize[id] ?? 0.01) + (averageBoobSize[id] ?? 0.01);

    const biasFnMember = (member: GuildMember) => biasFnId(member.id);
    const shuffledIds = shuffleArray(Array.from(members.keys()), biasFnId);
    const shuffledNames = shuffleArray(Array.from(members.values()), biasFnMember);

    if (shuffledIds.length !== shuffledNames.length) {
        throw new Error("Something went terribly wrong");
    }

    for (const [i, id] of shuffledIds.entries()) {
        shuffledNicknames[id] = shuffledNames[i].displayName;
    }

    return shuffledNicknames;
};

const shuffleAllNicknames = async (
    context: BotContext,
): Promise<PromiseSettledResult<GuildMember>[]> => {
    const allMembers = await context.guild.members.fetch();
    const shuffledNicknames = await createShuffledNicknames(allMembers);

    return Promise.allSettled(
        allMembers.map(member => renameMember(member, shuffledNicknames[member.id])),
    );
};

const createColorfulRoles = async (context: BotContext): Promise<Role[]> => {
    const moderatorRole = context.moderatorRoles[0];
    const roleResults = await Promise.allSettled(
        Object.entries(colorfulRoles).map(([name, color]) =>
            context.guild.roles
                .create({
                    name,
                    color,
                })
                .then(role =>
                    context.guild.roles.setPosition(role.id, moderatorRole.position - 1, {
                        reason: "April April!",
                    }),
                ),
        ),
    );

    return verboslyGetPromiseSettledResults("Colorful role creation", roleResults);
};

const deleteColorfulRoles = async (context: BotContext): Promise<void> => {
    const deletionPromises = [];
    for (const roleName of Object.keys(colorfulRoles)) {
        const roles = context.guild.roles.cache.filter(r => r.name === roleName);
        if (roles.size < 1) continue;
        for (const [roleId, _role] of roles) {
            deletionPromises.push(context.guild.roles.delete(roleId));
        }
    }

    const deletionResults = await Promise.allSettled(deletionPromises);
    verboslyGetPromiseSettledResults("Colorful role deletion", deletionResults);
};

const assignColorfulRoles = async (
    context: BotContext,
    colorfulRoles: Role[],
): Promise<GuildMember[]> => {
    if (colorfulRoles.length <= 0) {
        return [];
    }

    const allMembers = await context.guild.members.fetch();
    const updatedMembers = await Promise.allSettled(
        [...allMembers.values()].map((member, idx) => {
            const role = colorfulRoles[idx % colorfulRoles.length] ?? colorfulRoles[0];
            return member.roles.add(role.id, "April April!");
        }),
    );
    return verboslyGetPromiseSettledResults("Colorful role assignment", updatedMembers);
};

export const startAprilFools = async (context: BotContext): Promise<void> => {
    log.debug("Entered `startAprilFools`");

    try {
        const result = await shuffleAllNicknames(context);
        verboslyGetPromiseSettledResults("Nickname shuffle", result);

        const roles = await createColorfulRoles(context);
        await assignColorfulRoles(context, roles);
    } catch (err) {
        sentry.captureException(err);
        log.error(err, "Could not perform april fools joke");
    }
};

export const endAprilFools = async (context: BotContext): Promise<void> => {
    log.debug("Entered `endAprilFools`");

    try {
        const result = await resetAll(context);
        verboslyGetPromiseSettledResults("Nickname reset", result);

        await deleteColorfulRoles(context);
    } catch (err) {
        sentry.captureException(err);
        log.error(err, "Could not end april fools joke");
    }
};
