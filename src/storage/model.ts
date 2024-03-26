import type { Snowflake } from "discord.js";
import type { ColumnType, GeneratedAlways, Selectable } from "kysely";

import type { OneBasedMonth } from "./birthday.js";
import type { Radius } from "../commands/penis.js";

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
}

export interface AuditedTable {
    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
}

export type Uuid = string;

export type Birthday = Selectable<BirthdayTable>;
export interface BirthdayTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake;
    month: OneBasedMonth;
    day: number;
}

export type Stempel = Selectable<StempelTable>;
export interface StempelTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    invitator: Snowflake;
    invitedMember: Snowflake;
}

export type SplidLink = Selectable<SplidLinkTable>;
export interface SplidLinkTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

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
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    creatorId: Snowflake;
    guildId: Snowflake;
    groupCode: string;
    // TODO: Seems to be client specific:
    // externalSplidGroupId: string;
    shortDescription: string;
    longDescription: string | null;
}
/*
indexes: [
    {
        fields: ["guildId"],
    },
    {
        unique: true,
        fields: ["shortDescription"],
    },
    // {
    //     unique: true,
    //     fields: ["externalSplidGroupId", "guildId"],
    // },
    {
        unique: true,
        fields: ["groupCode", "guildId"],
    },
],
*/

export type GuildRagequit = Selectable<GuildRagequitTable>;
export interface GuildRagequitTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    guildId: Snowflake;
    userId: Snowflake;
    numRagequits: number;
}
/*
{
    unique: true,
    fields: ["guildId", "userId"],
},
*/

export type NickName = Selectable<NickNameTable>;
export interface NickNameTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake;
    nickName: string;
}

export type Penis = Selectable<PenisTable>;
export interface PenisTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake;
    // TODO: Date is not supported by the DB driver
    measuredAt: ColumnType<string, string, never>;
    size: number;
    diameter: Radius;
}
/*
{
    using: "BTREE",
    fields: [
        {
            name: "measuredAt",
            order: "ASC",
        },
    ],
},
*/

export type Boob = Selectable<BoobTable>;
export interface BoobTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake;
    // TODO: Date is not supported by the DB driver
    measuredAt: ColumnType<string, string, never>;
    size: number;
}
/*
{
    using: "BTREE",
    fields: [
        {
            name: "measuredAt",
            order: "ASC",
        },
    ],
},
*/

export type AustrianTranslation = Selectable<AustrianTranslationTable>;
export interface AustrianTranslationTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    addedByUserId: string;
    austrian: string;
    german: string;
    description: string | null;
}
/*
{
    unique: true,
    fields: ["austrian"],
},
{
    unique: false,
    fields: ["german"],
},
*/

export type EhreVotes = Selectable<EhreVotesTable>;
export interface EhreVotesTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake; // unique: true,
}

export type EhrePoints = Selectable<EhrePointsTable>;
export interface EhrePointsTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake; // unique: true,
    points: number;
}

export type FadingMessage = Selectable<FadingMessageTable>;
export interface FadingMessageTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    messageId: Snowflake;
    channelId: Snowflake;
    guildId: Snowflake;

    // TODO: Date is not supported by the DB driver
    beginTime: ColumnType<string, string, never>;
    endTime: ColumnType<string, string, never>;
}

export type WoisAction = Selectable<WoisActionTable>;
export interface WoisActionTable extends AuditedTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    messageId: Snowflake; // unique: true,
    reason: string;
    // TODO: Date is not supported by the DB driver
    date: ColumnType<string, string, never>;

    // TODO: JSON types are currently not supported by the DB driver
    interestedUsers: ColumnType<string, string, string>; // Snowflake[];
    isWoisgangAction: boolean;
}
