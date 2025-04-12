import type { Snowflake } from "discord.js";
import type { ColumnType, Generated, GeneratedAlways, Insertable, Selectable } from "kysely";

import type { Radius } from "@/commands/penis.js";

export type Date = ColumnType<string, string, string>; // TODO: Date is not supported by DB Driver

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
    lootAttribute: LootAttributeTable;
    emote: EmoteTable;
    emoteUse: EmoteUseTable;
    scrobblerRegistration: ScrobblerRegistrationTable;
    scrobblerSpotifyLog: ScrobblerSpotifyLogTable;
    scrobblerSpotifyLogView: ScrobblerSpotifyLogView;
    spotifyArtists: SpotifyArtistTable;
    spotifyTracks: SpotifyTrackTable;
    spotifyTrackToArtists: SpotifyTrackToArtistTable;
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
    radius: Radius;
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

export type LootId = number;
export type LootOrigin = "drop" | "owner-transfer" | "replacement" | "birthday";

export type Loot = Selectable<LootTable>;
export type LootInsertable = Insertable<LootTable>;

export interface LootTable extends AuditedTable {
    id: GeneratedAlways<LootId>;

    displayName: string;
    description: string;
    lootKindId: number;
    winnerId: string;
    /** Different from createdAt. If the item is replaced, this may be copied form the previous loot item */
    claimedAt: ColumnType<string, string, string>; // TODO: Date is not supported by the DB driver
    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
    usedImage: string | null;

    deletedAt: ColumnType<string | null, string | null, string | null>; // TODO: Date is not supported by the DB driver

    predecessor: LootId | null;
    origin: LootOrigin;
}

export type LootAttributeId = number;

export type LootAttribute = Selectable<LootAttributeTable>;
export type LootAttributeInsertable = Insertable<LootAttributeTable>;

export interface LootAttributeTable extends AuditedTable {
    id: GeneratedAlways<LootAttributeId>;

    lootId: LootId;
    attributeKindId: number;
    attributeClassId: number;

    displayName: string;
    shortDisplay: string;
    color: number | null;

    deletedAt: ColumnType<string | null, string | null, string | null>; // TODO: Date is not supported by the DB driver
}

export type Emote = Selectable<EmoteTable>;

export interface EmoteTable extends AuditedTable {
    id: GeneratedAlways<number>;

    emoteId: ColumnType<Snowflake, Snowflake, never>;
    name: string;
    isAnimated: boolean;
    url: string;
    data: Uint8Array;

    deletedAt: ColumnType<string | null, null, string | null>; // TODO: Date is not supported by the DB driver
}

export type EmoteUse = Selectable<EmoteUseTable>;

export interface EmoteUseTable extends AuditedTable {
    id: GeneratedAlways<number>;

    messageGuildId: ColumnType<Snowflake, Snowflake, never>;
    channelId: ColumnType<Snowflake, Snowflake, never>;
    emoteId: ColumnType<number, number, never>;
    isReaction: boolean;
}

export type ScrobblerRegistration = Selectable<ScrobblerRegistrationTable>;

export interface ScrobblerRegistrationTable extends AuditedTable {
    id: GeneratedAlways<number>;
    userId: Snowflake;
    activated: boolean;
}

export type ScrobblerSpotifyLog = Selectable<ScrobblerSpotifyLogTable>;

export interface ScrobblerSpotifyLogTable extends AuditedTable {
    id: GeneratedAlways<number>;
    userId: Snowflake;
    spotifyId: string;
    startedActivity: Date;
}

export type SpotifyTrack = Selectable<SpotifyTrackTable>;

export interface SpotifyTrackTable {
    trackId: string;
    name: string;
    imageUrl: string;
}

export type SpotifyArtist = Selectable<SpotifyArtistTable>;

export interface SpotifyArtistTable {
    artistId: string;
    name: string;
    imageUrl: string;
}

export type SpotifyTrackToArtists = Selectable<SpotifyArtistTable>;

export interface SpotifyTrackToArtistTable {
    trackId: string;
    artistId: string;
}

export type ScrobblerSpotifyLogEntry = {
    userId: string;
    startedActivity: string;
    track: {
        trackId: string;
        name: string;
        imageUrl: string | null;
    };
    artists: {
        artistId: string;
        name: string;
        imageUrl: string | null;
    }[];
};

export interface ScrobblerSpotifyLogView {
    userId: string;
    trackId: string;
    trackName: string;
    trackImageUrl: string | null;
    artistId: string;
    artistName: string;
    artistImageUrl: string | null;
    startedActivity: string;
}
