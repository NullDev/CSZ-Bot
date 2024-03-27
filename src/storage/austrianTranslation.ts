import type { GuildMember } from "discord.js";

import type { AustrianTranslation } from "./model.js";

import db from "./db.js";
import log from "@log";

export function persistOrUpdate(
    addedBy: GuildMember,
    german: string,
    austrian: string,
    description: string | null,
    ctx = db(),
): Promise<AustrianTranslation> {
    log.debug(
        `Saving austrian translation for user ${addedBy}. German: ${german}; Austrian: ${austrian}`,
    );

    return ctx
        .insertInto("austrianTranslations")
        .values({
            addedByUserId: addedBy.id,
            austrian,
            german,
            description,
        })
        .onConflict(oc =>
            oc.column("austrian").doUpdateSet({
                german,
                description,
            }),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function findTranslation(
    austrian: string,
    ctx = db(),
): Promise<AustrianTranslation | undefined> {
    const normalized = austrian.trim().toLowerCase();
    const withoutWhitespace = normalized.replace(/[^\w\s]/gu, "");
    return ctx
        .selectFrom("austrianTranslations")
        .where(({ eb, or }) =>
            or([
                // we want like to be case-insensitive, we don't need a placeholder
                // We might have translations with punctuations in it, so we simply try to match the whole string against it
                eb("austrian", "like", normalized),
                // If we couldn't find a translation with the punctuations in it, we remove the special chars
                eb("austrian", "like", withoutWhitespace),
            ]),
        )
        .selectAll()
        .executeTakeFirst();
}
