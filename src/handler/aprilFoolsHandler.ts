import { Client, Collection, GuildMember, Snowflake } from "discord.js";
import Boob from "../storage/model/Boob";
import Penis from "../storage/model/Penis";
import { getConfig } from "../utils/configHandler";
import logger from "../utils/logger";

const config = getConfig();

// Store old usernames. Hope the bot doesn't crash lol
const tmpNicknameStore: Record<Snowflake, string> = {};

const renameMember = (member: GuildMember, name: string | null): Promise<GuildMember> => member.setNickname(name, "April Fools")
    .catch(err => {
        throw new Error(`Could not rename Member: ${member.id} to ${name} because of`, err);
    });


const resetAll = async(client: Client): Promise<PromiseSettledResult<GuildMember>[]> => {
    const guild = client.guilds.cache.get(config.ids.guild_id)!;
    const allMembers = await guild.members.fetch();
    return Promise.allSettled(allMembers.map(member => renameMember(member, tmpNicknameStore[member.id] ?? null)));
};

const shuffleArray = <T>(array: T[], biasFn: (item: T) => number): T[] => array
    .map((value, idx) => ({ value, bias: biasFn(value) }))
    .sort((a, b) => a.bias - b.bias)
    .map(({ value }) => value);

const createShuffledNicknames = async(members: Collection<Snowflake, GuildMember>): Promise<Record<Snowflake, string>> => {
    const shuffledNicknames: Record<Snowflake, string> = {};
    Array.from(members.entries())
        .forEach(([id, member]) => {
            tmpNicknameStore[id] = member.displayName;
        });

    const averageCockSize: Record<Snowflake, number> = await Penis.getAveragePenisSizes();
    const averageBoobSize: Record<Snowflake, number> = await Boob.getAverageBoobSizes();
    const biasFnId = (id: Snowflake): number => Math.random() * (averageCockSize[id] ?? 0.01) + (averageBoobSize[id] ?? 0.01);
    const biasFnMember = (member: GuildMember): number => biasFnId(member.id);
    const shuffledIds = shuffleArray(Array.from(members.keys()), biasFnId);
    const shuffledNames = shuffleArray(Array.from(members.values()), biasFnMember);

    if(shuffledIds.length !== shuffledNames.length) {
        throw new Error("Something went terribly wrong");
    }

    for(const [i, id] of shuffledIds.entries()) {
        shuffledNicknames[id] = shuffledNames[i].displayName;
    }

    return shuffledNicknames;
};

const shuffleAllNicknames = async(client: Client): Promise<PromiseSettledResult<GuildMember>[]> => {
    const guild = client.guilds.cache.get(config.ids.guild_id)!;
    const allMembers = await guild.members.fetch();
    const shuffledNicknames = await createShuffledNicknames(allMembers);

    return Promise.allSettled(allMembers.map(member => renameMember(member, shuffledNicknames[member.id])));
};

const logRenameResult = (result: PromiseSettledResult<GuildMember>[]) => {
    const fulfilled = result.filter(p => p.status === "fulfilled") as PromiseFulfilledResult<GuildMember>[];
    const rejected = result.filter(p => p.status === "rejected") as PromiseRejectedResult[];

    logger.info(`${fulfilled.length} users where renamed. ${rejected.length} renamings failed`);
    for (const rejection of rejected) {
        logger.error(`Rename failed because of: ${rejection.reason}`);
    }
};

export const startAprilFools = async(client: Client): Promise<void> => {
    try {
        const result = await shuffleAllNicknames(client);
        logRenameResult(result);
    }
    catch(err) {
        logger.error("Could not perform april fools joke", err);
    }
};

export const endAprilFools = async(client: Client): Promise<void> => {
    try {
        const result = await resetAll(client);
        logRenameResult(result);
    }
    catch(err) {
        logger.error("Could not end april fools joke", err);
    }
};
