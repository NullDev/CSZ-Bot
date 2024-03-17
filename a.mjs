import { SplidClient } from "splid-js";
const client = new SplidClient({
    installationId: "b65aa4f8-b6d5-4b51-9df6-406ce2026b32", // TODO: Move to config
});

const vpn = "18Z4VJLPB";
const summit = "3AN4J72K5";
const mehner = "LJVDLBFU2";
const inviteCode = mehner;
const groupRes = await client.group.getByInviteCode(inviteCode);

const groupInfoRes = await client.groupInfo.getByGroup(
    groupRes.result.objectId,
);
console.log(groupInfoRes.result.results);

const membersRes = await client.person.getByGroup(groupRes.result.objectId);

const members = membersRes.result.results.map(p => ({
    name: p.name,
    initials: p.initials,
    globalId: p.GlobalId,
    objectId: p.objectId,
}));
const membersMap = new Map(members.map(m => [m.globalId, m]));
const balanceMatrix = new Map(
    members.map(m => [m.globalId, new Map(members.map(m => [m.globalId, 0]))]),
);

const entriesRes = await client.entry.getByGroup(groupRes.result.objectId);
const entries = entriesRes.result.results;
console.log(entries);
for (const entry of entries) {
    // console.log(entry);
    const primaryPayer = membersMap.get(entry.primaryPayer);

    for (const item of entry.items) {
        const partsMembers = item.P?.P;
        if (!partsMembers) {
            console.warn("No partsMembers");
            console.warn(item);
            continue;
        }

        const amount = item.AM;
        if (!amount) {
            console.warn("No amount");
            console.warn(item);
            continue;
        }

        // console.log(partsMembers);
        // console.log(item);

        console.log(
            `${primaryPayer.name} paid for "${entry.title}" ${amount} ${entry.currencyCode} (${entry.isPayment})`,
        );

        for (const [memberId, parts] of Object.entries(partsMembers)) {
            const member = membersMap.get(memberId);
            console.log(
                `${primaryPayer.name} paid for ${member.name} ${
                    amount * parts * (entry.isPayment ? 1 : -1)
                } ${entry.currencyCode}`,
            );

            const balanceRow = balanceMatrix.get(primaryPayer.globalId);
            const memberBalanceForPayer = balanceRow.get(member.globalId);
            balanceRow.set(
                member.globalId,
                memberBalanceForPayer + amount * parts,
            );
        }
    }
    console.log("---------------");
}

console.log(balanceMatrix);
console.log(computeAccountBalances(balanceMatrix));

function computeAccountBalances(balanceMatrix) {
    const balances = {};
    for (const member of members) {
        let balance = 0;
        for (const [otherId, payed] of balanceMatrix.entries()) {
            const otherBalance = payed.get(member.globalId);
            balance -= otherBalance; // other payed for me
            balance += balanceMatrix.get(member.globalId).get(otherId); // me payed for him
        }
        balances[member.globalId] = balance;
    }
    return balances;
}
