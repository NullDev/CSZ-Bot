import { sql, type Kysely } from "kysely";
import { createUpdatedAtTrigger } from "@/storage/migrations/10-loot-attributes.js";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("fightInventory")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text")
        .addColumn("lootId", "integer", c => c.references("loot.id"))
        .addColumn("equippedSlot", "text")
        .execute();

    await db.schema
        .createTable("fightHistory")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("bossName", "text", c => c.notNull())
        .addColumn("result", "boolean", c => c.notNull())
        .addColumn("firstTime", "boolean", c => c.notNull())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await createUpdatedAtTrigger(db, "fightHistory");
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
