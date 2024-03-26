import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    //#region birthdays

    await db.schema.alterTable("birthdays").renameTo("old_birthdays").execute();
    await db.schema
        .createTable("birthdays")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull().unique())
        .addColumn("month", "integer", c => c.notNull())
        .addColumn("day", "integer", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db
        .insertInto("birthdays")
        .columns(["userId", "month", "day", "createdAt", "updatedAt"])
        .expression(
            db
                .selectFrom("old_birthdays")
                .select(["userId", "month", "day", "createdAt", "updatedAt"]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "birthdays");

    //#endregion
    //#region stempels

    await db.schema.alterTable("stempels").renameTo("old_stempels").execute();
    await db.schema
        .createTable("stempels")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("inviterId", "text", c => c.notNull())
        .addColumn("invitedMemberId", "text", c => c.notNull().unique())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db
        .insertInto("stempels")
        .columns(["inviterId", "invitedMemberId", "createdAt", "updatedAt"])
        .expression(
            db
                .selectFrom("old_stempels")
                .select([
                    "invitator as inviterId",
                    "invitedMember as invitedMemberId",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "stempels");

    //#endregion
    //#region splidLinks

    await db.schema
        .alterTable("splidLinks")
        .renameTo("old_splidLinks")
        .execute();
    await db.schema
        .createTable("splidLinks")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("discordUserId", "text", c => c.notNull())
        .addColumn("externalSplidId", "text", c => c.notNull())

        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("splidLinks_guildId_discordUserId_discordUserId")
        .on("splidLinks")
        .columns(["guildId", "discordUserId", "externalSplidId"])
        .unique()
        .execute();

    await db.schema
        .createIndex("splidLinks_externalSplidId_discordUserId")
        .on("splidLinks")
        .columns(["externalSplidId", "discordUserId"])
        .execute();

    await db
        .insertInto("splidLinks")
        .columns([
            "guildId",
            "discordUserId",
            "externalSplidId",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_splidLinks")
                .select([
                    "guildId",
                    "discordUserId",
                    "externalSplidId",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "splidLinks");

    //#endregion
    //#region splidGroups

    await db.schema
        .alterTable("splidGroups")
        .renameTo("old_splidGroups")
        .execute();

    await db.schema
        .createTable("splidGroups")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("creatorId", "text", c => c.notNull())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("groupCode", "text", c => c.notNull())
        .addColumn("shortDescription", "text", c => c.notNull().unique())
        .addColumn("longDescription", "text", c => c.defaultTo(null))
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("splidGroups_guildId")
        .on("splidGroups")
        .column("guildId")
        .execute();

    await db.schema
        .createIndex("splidGroups_groupCode_guildId")
        .on("splidGroups")
        .columns(["groupCode", "guildId"])
        .unique()
        .execute();

    await db
        .insertInto("splidGroups")
        .columns([
            "creatorId",
            "guildId",
            "groupCode",
            "shortDescription",
            "longDescription",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_splidGroups")
                .select([
                    "creatorId",
                    "guildId",
                    "groupCode",
                    "shortDescription",
                    "longDescription",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "splidGroups");

    //#endregion
    //#region guildRageQuits

    await db.schema
        .alterTable("guildRageQuits")
        .renameTo("old_guildRageQuits")
        .execute();

    await db.schema
        .createTable("guildRageQuits")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("numRageQuits", "integer", c => c.notNull().defaultTo(1))
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("guildRageQuits_guildId_userId")
        .on("guildRageQuits")
        .columns(["guildId", "userId"])
        .unique()
        .execute();

    await db
        .insertInto("guildRageQuits")
        .columns([
            "guildId",
            "userId",
            "numRageQuits",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_guildRageQuits")
                .select([
                    "guildId",
                    "userId",
                    "numRageQuits",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "guildRageQuits");

    //#endregion
    //#region penis

    await db.schema.alterTable("penis").renameTo("old_penis").execute();

    await db.schema
        .createTable("penis")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("size", "integer", c => c.notNull())
        .addColumn("diameter", "integer", c => c.notNull())
        .addColumn("measuredAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("penis_measuredAt")
        .on("penis")
        .column("measuredAt desc")
        .execute();

    await db
        .insertInto("penis")
        .columns(["userId", "size", "diameter", "measuredAt"])
        .expression(
            db
                .selectFrom("old_penis")
                .select(["userId", "size", "diameter", "measuredAt"]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "penis");

    //#endregion
    //#region boob

    await db.schema.alterTable("boobs").renameTo("old_boobs").execute();

    await db.schema
        .createTable("boobs")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("size", "integer", c => c.notNull())
        .addColumn("measuredAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("boobs_measuredAt")
        .on("boobs")
        .column("measuredAt desc")
        .execute();

    await db
        .insertInto("boobs")
        .columns(["userId", "size", "measuredAt"])
        .expression(
            db.selectFrom("old_boobs").select(["userId", "size", "measuredAt"]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "boobs");

    //#endregion
    //#region fadingMessages

    await db.schema
        .alterTable("fadingMessages")
        .renameTo("old_fadingMessages")
        .execute();

    await db.schema
        .createTable("fadingMessages")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("messageId", "text", c => c.notNull())
        .addColumn("beginTime", "timestamp", c => c.notNull())
        .addColumn("endTime", "timestamp", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("fadingMessages_endTime")
        .on("fadingMessages")
        .column("endTime desc")
        .execute();

    await db
        .insertInto("fadingMessages")
        .columns(["guildId", "channelId", "messageId", "beginTime", "endTime"])
        .expression(
            db
                .selectFrom("old_fadingMessages")
                .select([
                    "guildId",
                    "channelId",
                    "messageId",
                    "beginTime",
                    "endTime",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "fadingMessages");

    //#endregion
    //#region woisActions

    await db.schema
        .alterTable("woisActions")
        .renameTo("old_woisActions")
        .execute();

    await db.schema
        .createTable("woisActions")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("messageId", "text", c => c.notNull())
        .addColumn("reason", "text", c => c.notNull())
        .addColumn("date", "timestamp", c => c.notNull())
        .addColumn("interestedUsers", "json", c => c.notNull().defaultTo("[]"))
        .addColumn("isWoisgangAction", "boolean", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db
        .insertInto("woisActions")
        .columns([
            "messageId",
            "reason",
            "date",
            "interestedUsers",
            "isWoisgangAction",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_woisActions")
                .select([
                    "messageId",
                    "reason",
                    "date",
                    "interestedUsers",
                    "isWoisgangAction",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "woisActions");

    //#endregion
    //#region bans

    await db.schema.alterTable("bans").renameTo("old_bans").execute();

    await db.schema
        .createTable("bans")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull().unique())
        .addColumn("reason", "text")
        .addColumn("bannedUntil", "timestamp")
        .addColumn("isSelfBan", "boolean", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("bans_bannedUntil")
        .on("bans")
        .column("bannedUntil asc")
        .execute();

    await db
        .insertInto("bans")
        .columns([
            "userId",
            "reason",
            "bannedUntil",
            "isSelfBan",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_bans")
                .select([
                    "userId",
                    "reason",
                    "bannedUntil",
                    "isSelfBan",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "bans");

    //#endregion
    //#region reminders

    await db.schema.alterTable("reminders").renameTo("old_reminders").execute();

    await db.schema
        .createTable("reminders")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("messageId", "text")
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("remindAt", "timestamp", c => c.notNull())
        .addColumn("reminderNote", "text")
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("reminders_remindAt")
        .on("reminders")
        .column("remindAt asc")
        .execute();

    await db
        .insertInto("reminders")
        .columns([
            "guildId",
            "channelId",
            "messageId",
            "userId",
            "remindAt",
            "reminderNote",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_reminders")
                .select([
                    "guildId",
                    "channelId",
                    "messageId",
                    "userId",
                    "remindAt",
                    "reminderNote",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "reminders");

    //#endregion
}

function createUpdatedAtTrigger(db: Kysely<any>, tableName: string) {
    return sql
        .raw(`
    create trigger ${tableName}_updatedAt
    after update on ${tableName} for each row
    begin
        update ${tableName}
        set updatedAt = current_timestamp
        where id = old.id;
    end;
    `)
        .execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {
    throw new Error("Not supported lol");
}
