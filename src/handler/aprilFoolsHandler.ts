import { Collection, GuildMember, Snowflake } from "discord.js";

import type { BotContext } from "../context.js";
import Boob from "../storage/model/Boob.js";
import Penis from "../storage/model/Penis.js";
import log from "../utils/logger.js";

// Store old usernames. Hope the bot doesn't crash lol
const tmpNicknameStore: Record<Snowflake, string> = {};

const renameMember = (
    member: GuildMember,
    name: string | null,
): Promise<GuildMember> =>
    member.setNickname(name, "April Fools").catch((err) => {
        throw new Error(
            `Could not rename Member: ${member.id} to ${name} because of ${err}`,
        );
    });

const resetAll = async (
    context: BotContext,
): Promise<PromiseSettledResult<GuildMember>[]> => {
    const allMembers = await context.guild.members.fetch();
    return Promise.allSettled(
        allMembers.map((member) =>
            renameMember(member, tmpNicknameStore[member.id] ?? null),
        ),
    );
};

const shuffleArray = <T>(array: T[], biasFn: (item: T) => number): T[] =>
    array
        .map((value, _idx) => ({ value, bias: biasFn(value) }))
        .sort((a, b) => a.bias - b.bias)
        .map(({ value }) => value);

const createShuffledNicknames = async (
    members: Collection<Snowflake, GuildMember>,
): Promise<Record<Snowflake, string>> => {
    const shuffledNicknames: Record<Snowflake, string> = {};
    Array.from(members.entries()).forEach(([id, member]) => {
        tmpNicknameStore[id] = member.displayName;
    });

    const averageCockSize: Record<Snowflake, number> =
        await Penis.getAveragePenisSizes();
    const averageBoobSize: Record<Snowflake, number> =
        await Boob.getAverageBoobSizes();
    const biasFnId = (id: Snowflake): number =>
        Math.random() * (averageCockSize[id] ?? 0.01) +
        (averageBoobSize[id] ?? 0.01);
    const biasFnMember = (member: GuildMember): number => biasFnId(member.id);
    const shuffledIds = shuffleArray(Array.from(members.keys()), biasFnId);
    const shuffledNames = shuffleArray(
        Array.from(members.values()),
        biasFnMember,
    );

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
        allMembers.map((member) =>
            renameMember(member, shuffledNicknames[member.id]),
        ),
    );
};

const logRenameResult = (result: PromiseSettledResult<GuildMember>[]) => {
    const fulfilled = result.filter(
        (p) => p.status === "fulfilled",
    ) as PromiseFulfilledResult<GuildMember>[];
    const rejected = result.filter(
        (p) => p.status === "rejected",
    ) as PromiseRejectedResult[];

    log.info(
        `${fulfilled.length} users where renamed. ${rejected.length} renamings failed`,
    );
    for (const rejection of rejected) {
        log.error(`Rename failed because of: ${rejection.reason}`);
    }
};

export const startAprilFools = async (context: BotContext): Promise<void> => {
    try {
        const result = await shuffleAllNicknames(context);
        logRenameResult(result);
    } catch (err) {
        log.error(err, "Could not perform april fools joke");
    }
};

export const endAprilFools = async (context: BotContext): Promise<void> => {
    try {
        const result = await resetAll(context);
        logRenameResult(result);
    } catch (err) {
        log.error(err, "Could not end april fools joke");
    }
};
