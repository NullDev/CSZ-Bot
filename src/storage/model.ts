import type { Snowflake } from "discord.js";
import type { ColumnType, GeneratedAlways, Selectable } from "kysely";

import type { OneBasedMonth } from "./birthday.js";

export interface Database {
    birthdays: BirthdayTable;
    stempels: StempelTable;
    splidLinks: SplidLinkTable;
    splidGroups: SplidGroupTable;
    guildRageQuits: GuildRagequitTable;
    nickNames: NickNameTable;
}

export type Uuid = string;

export type Birthday = Selectable<BirthdayTable>;

export interface BirthdayTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake;
    month: OneBasedMonth;
    day: number;

    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
}

export type Stempel = Selectable<StempelTable>;

export interface StempelTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    invitator: Snowflake;
    invitedMember: Snowflake;

    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
}

export type SplidLink = Selectable<SplidLinkTable>;

export interface SplidLinkTable {
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

    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
}

export type SplidGroup = Selectable<SplidGroupTable>;

export interface SplidGroupTable {
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

    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
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
export interface GuildRagequitTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    guildId: Snowflake;
    userId: Snowflake;
    numRagequits: number;

    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
}
/*
{
    unique: true,
    fields: ["guildId", "userId"],
},
*/

export type NickName = Selectable<NickNameTable>;
export interface NickNameTable {
    // Cannot use GeneratedAlways because sequelize generated the ID on the client side
    // id: GeneratedAlways<Uuid>;
    id: ColumnType<Uuid, Uuid, never>;

    userId: Snowflake;
    nickName: string;

    // TODO: These don't seem to be taken care of by the database, so we need to insert them manually
    // Also, Date is not supported by the DB driver
    createdAt: ColumnType<string, string, never>;
    updatedAt: ColumnType<string, string, never>;
}
