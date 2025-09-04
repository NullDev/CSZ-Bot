import { sql, type Kysely } from "kysely";
import { createUpdatedAtTrigger } from "@/storage/migrations/10-loot-attributes.js";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("fightinventory")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userid", "text")
        .addColumn("lootId", "integer", c => c.references("loot.id"))
        .addColumn("equippedSlot", "text")
        .execute();
    await db.schema
        .createTable("fighthistory")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userid", "text", c => c.notNull())
        .addColumn("bossName", "text", c => c.notNull())
        .addColumn("firsttime", "boolean", c => c.notNull())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();
    await createUpdatedAtTrigger(db, "fighthistory");
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
