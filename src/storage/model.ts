import type { Snowflake } from "discord.js";
import type { ColumnType, GeneratedAlways, Selectable } from "kysely";

import type { OneBasedMonth } from "./birthday.js";

export interface Database {
    birthdays: BirthdayTable;
    stempels: StempelTable;
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
