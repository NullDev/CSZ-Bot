import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("old_birthdays").execute();
    await db.schema.dropTable("old_stempels").execute();
    await db.schema.dropTable("old_splidLinks").execute();
    await db.schema.dropTable("old_splidGroups").execute();
    await db.schema.dropTable("old_guildRageQuits").execute();
    await db.schema.dropTable("old_penis").execute();
    await db.schema.dropTable("old_boobs").execute();
    await db.schema.dropTable("old_fadingMessages").execute();
    await db.schema.dropTable("old_woisActions").execute();
    await db.schema.dropTable("old_bans").execute();
    await db.schema.dropTable("old_reminders").execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
    throw new Error("Not supported lol");
}
