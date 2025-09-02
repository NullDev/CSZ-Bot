import type { Kysely } from "kysely";

// https://github.com/NullDev/CSZ-Bot/issues/509

export async function up(db: Kysely<any>): Promise<void> {
    await db
        .deleteFrom("nickNames")
        .where(({ fn }) => fn<number>("length", ["nickName"]), ">", 32)
        .execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
    throw new Error("Not supported lol");
}
