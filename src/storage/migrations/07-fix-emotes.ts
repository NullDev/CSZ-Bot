import { type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema.dropIndex("emoteUse_emoteId_isReaction_deletedAt").execute();
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
