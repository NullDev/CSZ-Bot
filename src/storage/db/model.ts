import type { Snowflake } from "discord.js";
import type { ColumnType, Generated, GeneratedAlways, Selectable } from "kysely";

import type { Radius } from "../../commands/penis.js";

export interface Database {
    birthdays: BirthdayTable;
    stempels: StempelTable;
    splidLinks: SplidLinkTable;
    splidGroups: SplidGroupTable;
    guildRageQuits: GuildRagequitTable;
    nickNames: NickNameTable;
    penis: PenisTable;
    boobs: BoobTable;
    austrianTranslations: AustrianTranslationTable;
    ehreVotes: EhreVotesTable;
    ehrePoints: EhrePointsTable;
    fadingMessages: FadingMessageTable;
    woisActions: WoisActionTable;
    additionalMessageData: AdditionalMessageDataTable;
    bans: BanTable;
    reminders: ReminderTable;
    loot: LootTable;
    emote: EmoteTable;
    emoteUse: EmoteUseTable;
}

export type OneBasedMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface AuditedTable {
    createdAt: GeneratedAlways<string>;
    updatedAt: GeneratedAlways<string>;
}

export type Birthday = Selectable<BirthdayTable>;
export interface BirthdayTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
    month: OneBasedMonth;
    day: number;
}

export type Stempel = Selectable<StempelTable>;
export interface StempelTable extends AuditedTable {
    id: GeneratedAlways<number>;

    inviterId: Snowflake;
    invitedMemberId: Snowflake;
}

export type SplidLink = Selectable<SplidLinkTable>;
export interface SplidLinkTable extends AuditedTable {
    id: GeneratedAlways<number>;

    /**
     * We scope the link to the guild for privacy reasons.
     * This way, the user can link himself in a guild an still be anonymous in a different guild.
     */
    guildId: Snowflake;
    discordUserId: Snowflake;
    externalSplidId: string;
}

export type SplidGroup = Selectable<SplidGroupTable>;
export interface SplidGroupTable extends AuditedTable {
    id: GeneratedAlways<number>;

    creatorId: Snowflake;
    guildId: Snowflake;
    groupCode: string;
    // TODO: Seems to be client specific:
    // externalSplidGroupId: string;
    shortDescription: string;
    longDescription: string | null;
}

export type GuildRagequit = Selectable<GuildRagequitTable>;
export interface GuildRagequitTable extends AuditedTable {
    id: GeneratedAlways<number>;

    guildId: Snowflake;
    userId: Snowflake;
    numRageQuits: Generated<number>;
}

export type NickName = Selectable<NickNameTable>;
export interface NickNameTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
    nickName: string;
}

export type Penis = Selectable<PenisTable>;
export interface PenisTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
    size: number;
    diameter: Radius;
    measuredAt: Generated<string>; // TODO: Date is not supported by the DB driver
}

export type Boob = Selectable<BoobTable>;
export interface BoobTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
    size: number;
    measuredAt: Generated<string>; // TODO: Date is not supported by the DB driver
}

export type AustrianTranslation = Selectable<AustrianTranslationTable>;
export interface AustrianTranslationTable extends AuditedTable {
    id: GeneratedAlways<number>;

    addedByUserId: Snowflake;
    austrian: string;
    german: string;
    description: string | null;
}

export type EhreVotes = Selectable<EhreVotesTable>;
export interface EhreVotesTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
}

export type EhrePoints = Selectable<EhrePointsTable>;
export interface EhrePointsTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
    points: number;
}

export type FadingMessage = Selectable<FadingMessageTable>;
export interface FadingMessageTable extends AuditedTable {
    id: GeneratedAlways<number>;

    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;

    beginTime: ColumnType<string, string, never>; // TODO: Date is not supported by the DB driver
    endTime: ColumnType<string, string, never>; // TODO: Date is not supported by the DB driver
}

export type WoisAction = Selectable<WoisActionTable>;
export interface WoisActionTable extends AuditedTable {
    id: GeneratedAlways<number>;

    messageId: Snowflake; // unique: true,
    reason: string;
    date: ColumnType<string, string, never>; // TODO: Date is not supported by the DB driver

    // TODO: JSON types are currently not supported by the DB driver
    interestedUsers: ColumnType<string, string, string>; // Snowflake[];
    isWoisgangAction: boolean;
}

export type DataUsage = "DELAYED_POLL";

export type AdditionalMessageData = Selectable<AdditionalMessageDataTable>;
export interface AdditionalMessageDataTable extends AuditedTable {
    id: GeneratedAlways<number>;

    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
    usage: DataUsage;

    /** Just a string, so the specific use-case can decide on how to save the data. */
    payload: string;
}

export type Ban = Selectable<BanTable>;
export interface BanTable extends AuditedTable {
    id: GeneratedAlways<number>;

    userId: Snowflake;
    reason: string | null;

    bannedUntil: ColumnType<string | null, string | null, string | null>; // TODO: Date is not supported by the DB driver
    isSelfBan: boolean;
}

export type Reminder = Selectable<ReminderTable>;
export interface ReminderTable extends AuditedTable {
    id: GeneratedAlways<number>;

    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake | null;

    userId: Snowflake;

    remindAt: ColumnType<string, string, string>; // TODO: Date is not supported by the DB driver
    reminderNote: string | null;
}

export type Loot = Selectable<LootTable>;
export interface LootTable extends AuditedTable {
    id: GeneratedAlways<number>;

    displayName: string;
    description: string;
    lootKindId: number;
    validUntil: ColumnType<string, string, string>; // TODO: Date is not supported by the DB driver
    winnerId: string | null;
    claimedAt: ColumnType<string | null, string | null, string | null>; // TODO: Date is not supported by the DB driver
    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
    usedImage: string | null;
}

export type Emote = Selectable<EmoteTable>;
export interface EmoteTable extends AuditedTable {
    id: GeneratedAlways<number>;

    guildId: ColumnType<Snowflake, Snowflake, never>;
    emoteId: ColumnType<Snowflake, Snowflake, never>;
    name: string;
    isAnimated: boolean | null;
    data: ArrayBuffer;

    deletedAt: ColumnType<string | null, null, string | null>; // TODO: Date is not supported by the DB driver
}

export type EmoteUse = Selectable<EmoteUseTable>;
export interface EmoteUseTable extends AuditedTable {
    id: GeneratedAlways<number>;

    guildId: ColumnType<Snowflake, Snowflake, never>;
    channelId: ColumnType<Snowflake, Snowflake, never>;
    messageId: ColumnType<Snowflake, Snowflake, never>;
    emoteId: ColumnType<number, number, never>;
    usedByUserId: ColumnType<Snowflake, Snowflake, never>;
    usedByUserName: string;
    isReaction: boolean;

    deletedAt: ColumnType<string | null, null, string | null>; // TODO: Date is not supported by the DB driver
}
