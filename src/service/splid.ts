import type { Guild, User } from "discord.js";
import { SplidClient } from "splid-js";

import type { SplidGroup } from "@/storage/db/model.js";

import * as splidGroup from "@/storage/splidGroup.js";
import * as time from "@/utils/time.js";
import log from "@log";

type ExternalInfo = { name: string; objectId: string };

export async function getExternalGroupInfo(inviteCode: string): Promise<ExternalInfo | undefined> {
    const client = new SplidClient({
        installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
    });

    const groupRes = await client.group.getByInviteCode(inviteCode);
    const groupId = groupRes.result.objectId;

    const groupInfoRes = await client.groupInfo.getByGroup(groupId);

    const info = groupInfoRes?.result?.results?.[0] ?? undefined;
    if (!info) {
        return undefined;
    }

    const name = (info.name as string | undefined) ?? undefined;
    if (!name) {
        return undefined;
    }

    const objectId = (info.objectId as string | undefined) ?? undefined;
    if (!objectId) {
        return undefined;
    }

    return {
        name,
        objectId,
    };
}

type CacheEntry = {
    created: number;
    data: ReturnType<typeof fetchExternalMemberDataLive>;
};
const memberCache = new Map<string, CacheEntry>();
const memberCacheRetentionMs = time.minutes(1);

export type SplidMember = {
    name: string;
    initials: string;
    objectId: string;
    globalId: string;
};

export async function fetchExternalMemberDataLive(group: SplidGroup): Promise<SplidMember[]> {
    const client = new SplidClient({
        installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
    });

    const groupRes = await client.group.getByInviteCode(group.groupCode);
    const groupId = groupRes.result.objectId;

    const membersRes = await client.person.getByGroup(groupId);

    // biome-ignore lint/suspicious/noExplicitAny: splid-js's types are broken here
    const members: any[] = membersRes?.result?.results ?? [];
    return members.map(m => ({
        name: m.name as string,
        initials: m.initials as string,
        objectId: m.objectId as string, // this somehow doesn't cut it. We need to use the globalId
        globalId: m.GlobalId as string,
    }));
}

//#region over-engineered caching

// TODO: maybe make this a factory etc
export async function fetchExternalMemberData(
    group: SplidGroup,
): ReturnType<typeof fetchExternalMemberDataLive> {
    const now = Date.now();
    const cached = memberCache.get(group.groupCode);

    if (cached) {
        if (now - cached.created < memberCacheRetentionMs) {
            return cached.data;
        }
        memberCache.delete(group.groupCode);
    }

    // Not awaiting, because we want cache the promise,
    // so every client will get the result instantly and we don't block here plus we won't fetch the result twice
    const data = fetchExternalMemberDataLive(group);

    memberCache.set(group.groupCode, {
        created: now,
        data,
    });

    return data;
}

//#region

async function fetchGroupEntries(group: SplidGroup) {
    const client = new SplidClient({
        installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
    });

    const groupRes = await client.group.getByInviteCode(group.groupCode);
    const groupId = groupRes.result.objectId;
    if (!groupId) {
        return undefined;
    }

    const entriesRes = await client.entry.getByGroup(groupId);
    const entries = entriesRes?.result?.results;
    if (!entries) {
        return undefined;
    }
    return entries as SplidEntry[];
}

type SplidEntry = {
    title: string;
    currencyCode: string;
    primaryPayer: string;
    items: {
        P?: {
            P?: Record<string /* global-id of user */, number /* fraction */>;
        };
        /** amount */
        AM?: number;
    }[];
};

function buildPaymentMatrix(members: readonly SplidMember[], entries: SplidEntry[]) {
    const paymentMatrix = new Map(
        members.map(m => [m.globalId, new Map(members.map(m => [m.globalId, 0]))]),
    );
    const membersMap = new Map(members.map(m => [m.globalId, m]));

    for (const entry of entries) {
        const primaryPayer = membersMap.get(entry.primaryPayer);
        if (!primaryPayer) {
            log.warn(
                `Could not find primary payer for entry "${entry.title}" (${entry.currencyCode}))`,
            );
            continue;
        }

        for (const item of entry.items) {
            const partsMembers = item.P?.P;
            if (!partsMembers) {
                log.warn(item, "No partsMembers");
                continue;
            }

            const amount = item.AM;
            if (!amount) {
                log.warn(item, "No amount");
                continue;
            }

            log.debug(
                `${primaryPayer.name} paid for "${entry.title}" ${amount} ${entry.currencyCode}`,
            );

            for (const [memberId, parts] of Object.entries(partsMembers)) {
                const member = membersMap.get(memberId);
                if (!member) {
                    log.warn(`Could not find member for id ${memberId}`);
                    continue;
                }

                log.debug(
                    `${primaryPayer.name} paid for ${member.name} ${
                        amount * parts
                    } ${entry.currencyCode}`,
                );

                const balanceRow = paymentMatrix.get(primaryPayer.globalId);
                if (!balanceRow) {
                    log.warn(`Could not find balance row for ${primaryPayer.name}`);
                    continue;
                }

                const memberBalanceForPayer = balanceRow.get(member.globalId) ?? 0;
                balanceRow.set(member.globalId, memberBalanceForPayer + amount * parts);
            }
        }
    }
    return paymentMatrix;
}

function computeAccountBalances(
    members: readonly SplidMember[],
    balanceMatrix: Map<string, Map<string, number>>,
): Record<string, number> {
    const balances: Record<string, number> = {};
    for (const member of members) {
        const payedForOthers = balanceMatrix.get(member.globalId);
        let balance = 0;
        for (const [otherId, payed] of balanceMatrix.entries()) {
            const payedForMe = payed.get(member.globalId);
            if (payedForMe !== undefined) {
                balance -= payedForMe; // other payed for me
            }

            const payedForHim = payedForOthers?.get(otherId);
            if (payedForHim !== undefined) {
                balance += payedForHim; // me payed for him
            }
        }

        balances[member.globalId] = balance;
    }
    return balances;
}

export function formatGroupCode(code: string) {
    const normalized = code.replace(/\s/g, "").toUpperCase().trim();

    const parts = [];
    for (let i = 0; i < normalized.length; i += 3) {
        parts.push(normalized.substring(i, i + 3));
    }
    return parts.join(" ");
}

export async function getMemberBalances(group: SplidGroup, members: readonly SplidMember[]) {
    const entries = await fetchGroupEntries(group);
    if (!entries) {
        return undefined;
    }

    const paymentMatrix = buildPaymentMatrix(members, entries);
    return computeAccountBalances(members, paymentMatrix);
}

export async function createGroup(
    creator: User,
    guild: Guild,
    groupCode: string,
    shortDescription: string,
    longDescription: string | null,
) {
    return await splidGroup.createSplidGroup(
        creator,
        guild,
        groupCode,
        shortDescription,
        longDescription,
    );
}

export async function getGroupByCode(guild: Guild, groupCode: string) {
    return await splidGroup.findOneByCodeForGuild(guild, groupCode);
}

export async function getAllGroups(guild: Guild) {
    return await splidGroup.findAllGroups(guild);
}

export async function deleteByInviteCode(code: string) {
    return await splidGroup.deleteByInviteCode(code);
}
