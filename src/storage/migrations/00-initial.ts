import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    // Initial schema that originated from sequelize
    // obtained from production database using ".schema" command
    // Just copied the raw SQL instead of using kysely's syntax.
    // Only added "IF NOT EXISTS", so users with a pre-existing database won't be fucked up
    // *Note*: Somehow the DB driver only executes the first statement if using a large string. That's why we have created multiple statements that are awaited.
    await sql`
    CREATE TABLE IF NOT EXISTS FadingMessages (
        id VARCHAR(36) PRIMARY KEY,
        messageId VARCHAR(32),
        channelId VARCHAR(32),
        guildId VARCHAR(32),
        beginTime DATETIME,
        endTime DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS AdditionalMessageData (
        id VARCHAR(36) PRIMARY KEY,
        messageId VARCHAR(32) NOT NULL,
        channelId VARCHAR(32) NOT NULL,
        guildId VARCHAR(32) NOT NULL,
        customData TEXT DEFAULT '{}',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS GuildRagequits (
        id VARCHAR(36) PRIMARY KEY,
        guildId VARCHAR(32) NOT NULL,
        userId VARCHAR(32) NOT NULL,
        numRagequits INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Stempels (
        id VARCHAR(36) PRIMARY KEY,
        invitator VARCHAR(32) NOT NULL,
        invitedMember VARCHAR(32) NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Bans (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL,
        reason VARCHAR(255),
        bannedUntil DATETIME,
        isSelfBan TINYINT(1) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Birthdays (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL UNIQUE,
        day INTEGER NOT NULL,
        month INTEGER NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Penis (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL,
        measuredAt DATETIME,
        size INTEGER NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        diameter INTEGER
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Nicknames (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL,
        nickName VARCHAR(32) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Boobs (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL,
        measuredAt DATETIME,
        size INTEGER NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);

    // addedByUserId and description did not actually exist, but later migrations assumed it
    // and other SQLite engines throw errors
    await sql`
    CREATE TABLE IF NOT EXISTS AustrianTranslations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        german VARCHAR(255) NOT NULL,
        addedByUserId VARCHAR(255) NULL,
        description VARCHAR(255) NULL,
        austrian VARCHAR(255) NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS Reminders (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL,
        remindAt DATETIME NOT NULL,
        messageId VARCHAR(32) NULL,
        channelId VARCHAR(32) NOT NULL,
        guildId VARCHAR(32) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        reminderNote VARCHAR(32) NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS EhrePoints (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL UNIQUE,
        points DOUBLE PRECISION NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS EhreVotes (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(32) NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS WoisActions (
        id VARCHAR(36) PRIMARY KEY,
        messageId VARCHAR(32) NOT NULL UNIQUE,
        reason VARCHAR(32) NOT NULL,
        date DATETIME NOT NULL,
        interestedUsers JSON,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        isWoisgangAction BOOLEAN
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS SplidGroups (
        id VARCHAR(36) PRIMARY KEY,
        creatorId VARCHAR(32) NOT NULL,
        guildId VARCHAR(32) NOT NULL,
        groupCode VARCHAR(32) NOT NULL,
        shortDescription VARCHAR(69) NOT NULL,
        longDescription VARCHAR(1000),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`
    CREATE TABLE IF NOT EXISTS SplidLinks (
        id VARCHAR(36) PRIMARY KEY,
        guildId VARCHAR(32) NOT NULL,
        discordUserId VARCHAR(32) NOT NULL,
        externalSplidId VARCHAR(420) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    );
    `.execute(db);
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS additional_message_data_guild_id_channel_id_message_id ON AdditionalMessageData (guildId, channelId, messageId);`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS guild_ragequits_guild_id_user_id ON GuildRagequits (guildId, userId);`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS bans_user_id ON Bans (userId);`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS bans_banned_until ON Bans (bannedUntil ASC);`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS penis_measured_at ON Penis (measuredAt ASC);`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS boobs_measured_at ON Boobs (measuredAt ASC);`.execute(db);
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS austrian_translations_austrian ON AustrianTranslations (austrian);`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS austrian_translations_german ON AustrianTranslations (german);`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS reminders_remind_at ON Reminders (remindAt ASC);`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS splid_groups_guild_id ON SplidGroups (guildId);`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS splid_groups_short_description ON SplidGroups (shortDescription);`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS splid_groups_group_code_guild_id ON SplidGroups (groupCode, guildId);`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS splid_links_external_splid_id_discord_user_id ON SplidLinks (externalSplidId, discordUserId);`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS splid_links_guild_id_discord_user_id_external_splid_id ON SplidLinks (guildId, discordUserId, externalSplidId);    `.execute(
        db,
    );
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
