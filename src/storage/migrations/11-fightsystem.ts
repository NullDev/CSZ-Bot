import {sql, type Kysely} from "kysely";
import {createUpdatedAtTrigger} from "@/storage/migrations/10-loot-attributes.js";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("fightinventory")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text")
        .addColumn("lootId", "integer", c => c.references("loot.id"))
        .addColumn("equippedSlot", "text")
        .execute();
    await db.schema
        .createTable("fighthistory")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("bossName", "text", c => c.notNull())
        .addColumn("result", "boolean", c => c.notNull())
        .addColumn("firstTime", "boolean", c => c.notNull())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();
    await createUpdatedAtTrigger(db, "fighthistory");
    await db.schema
        .createTable("position")
        .ifNotExists()
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userid", "text", c => c.notNull())
        .addColumn("x", "integer", c => c.notNull())
        .addColumn("y", "integer", c => c.notNull())
        .execute();
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
