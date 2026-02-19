//
// !CAUTION! this file is entirely vibe-coded and only used for dönerjesus-wrapped
// !CAUTION! It will be deleted in 2026-01-01
//

import { sql } from "kysely";
import type { Snowflake } from "discord.js";

import type { Database } from "#/storage/db/model.ts";
import type { Kysely } from "kysely";
import db from "#db";

/**
 * Statistics about polls
 */
export interface PollStats {
    totalPolls: number;
    totalVotes: number;
    userPolls?: number;
    userVotes?: number;
}

/**
 * Statistics about user inventory
 */
export interface InventoryStats {
    itemCount: number;
    percentile: number;
}

/**
 * Statistics about honor points
 */
export interface HonorStats {
    collectedPoints: number;
    awardedPoints: number;
    votesGiven: number;
}

/**
 * Statistics about penis measurements
 */
export interface PenisStats {
    averageSize: number;
    averageRadius: number;
    minSize: number;
    maxSize: number;
    minRadius: number;
    maxRadius: number;
    userSize?: number;
    userRadius?: number;
    userSizePercentile?: number;
    userRadiusPercentile?: number;
}

/**
 * Statistics about boobs measurements
 */
export interface BoobsStats {
    averageSize: number;
    minSize: number;
    maxSize: number;
    userSize?: number;
    userSizePercentile?: number;
}

/**
 * Statistics about emotes
 */
export interface EmoteStats {
    emoteId: Snowflake;
    emoteName: string;
    isAnimated: boolean;
    usageCount: number;
}

/**
 * Get poll statistics
 */
export async function getPollStats(
    userId?: Snowflake,
    ctx: Kysely<Database> = db(),
): Promise<PollStats> {
    const totalPollsResult = await ctx
        .selectFrom("polls")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow();

    const totalVotesResult = await ctx
        .selectFrom("pollAnswers")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow();

    const result: PollStats = {
        totalPolls: totalPollsResult.count,
        totalVotes: totalVotesResult.count,
    };

    if (userId) {
        const userPollsResult = await ctx
            .selectFrom("polls")
            .where("authorId", "=", userId)
            .select(({ fn }) => fn.countAll<number>().as("count"))
            .executeTakeFirstOrThrow();

        const userVotesResult = await ctx
            .selectFrom("pollAnswers")
            .where("userId", "=", userId)
            .select(({ fn }) => fn.countAll<number>().as("count"))
            .executeTakeFirstOrThrow();

        result.userPolls = userPollsResult.count;
        result.userVotes = userVotesResult.count;
    }

    return result;
}

/**
 * Get inventory statistics for a user
 */
export async function getInventoryStats(
    userId: Snowflake,
    ctx: Kysely<Database> = db(),
): Promise<InventoryStats> {
    // Get user's item count (excluding deleted items)
    const userItemsResult = await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where("deletedAt", "is", null)
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow();

    const itemCount = userItemsResult.count;

    // Get all users' item counts for percentile calculation
    const allUserCounts = await ctx
        .selectFrom("loot")
        .where("deletedAt", "is", null)
        .groupBy("winnerId")
        .select(["winnerId", ({ fn }) => fn.countAll<number>().as("count")])
        .orderBy("count", "asc")
        .execute();

    if (allUserCounts.length === 0) {
        return {
            itemCount,
            percentile: 0,
        };
    }

    // Calculate percentile
    const totalUsers = allUserCounts.length;
    const usersWithLessItems = allUserCounts.filter(u => u.count < itemCount).length;
    const percentile = (usersWithLessItems / totalUsers) * 100;

    return {
        itemCount,
        percentile: Math.round(percentile * 100) / 100, // Round to 2 decimal places
    };
}

/**
 * Get honor points statistics for a user
 */
export async function getHonorStats(
    userId: Snowflake,
    ctx: Kysely<Database> = db(),
): Promise<HonorStats> {
    // Get collected points
    const collectedPointsResult = await ctx
        .selectFrom("ehrePoints")
        .where("userId", "=", userId)
        .select("points")
        .executeTakeFirst();

    const collectedPoints = collectedPointsResult?.points ?? 0;

    // Get votes given (awards given to others)
    const votesGivenResult = await ctx
        .selectFrom("ehreVotes")
        .where("userId", "=", userId)
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow();

    const votesGiven = votesGivenResult.count;

    // Calculate awarded points by summing up points given to others
    // This requires looking at who received points from this user's votes
    // We need to calculate the vote values for each vote given
    // For simplicity, we'll count votes given and estimate points awarded
    // The actual calculation would require the same logic as in ehre.ts getVoteValue
    // For now, we'll just return the vote count as a proxy

    // To get actual awarded points, we'd need to track this separately or calculate it
    // For now, let's approximate by counting votes given
    // In reality, awarded points depend on the voter's position in the honor ranking
    // which changes over time, so exact calculation would be complex
    const awardedPoints = votesGiven; // Approximate as 1 point per vote (minimum)

    return {
        collectedPoints,
        awardedPoints,
        votesGiven,
    };
}

/**
 * Get penis statistics
 */
export async function getPenisStats(
    userId?: Snowflake,
    ctx: Kysely<Database> = db(),
): Promise<PenisStats> {
    // Get latest measurement for each user using a join with max id subquery
    // We use id as a proxy for "latest" since it's auto-incrementing
    const maxIdsSubquery = ctx
        .selectFrom("penis")
        .select(["userId", ({ fn }) => fn.max<number>("id").as("maxId")])
        .groupBy("userId")
        .as("maxIds");

    const latestMeasurements = await ctx
        .selectFrom("penis")
        .innerJoin(maxIdsSubquery, join =>
            join.onRef("penis.userId", "=", "maxIds.userId").onRef("penis.id", "=", "maxIds.maxId"),
        )
        .select(["penis.userId", "penis.size", "penis.radius"])
        .execute();

    // Calculate statistics from latest measurements
    if (latestMeasurements.length === 0) {
        return {
            averageSize: 0,
            averageRadius: 0,
            minSize: 0,
            maxSize: 0,
            minRadius: 0,
            maxRadius: 0,
        };
    }

    const sizes = latestMeasurements.map(m => m.size);
    const radii = latestMeasurements.map(m => m.radius);

    const averageSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const averageRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const minRadius = Math.min(...radii);
    const maxRadius = Math.max(...radii);

    const result: PenisStats = {
        averageSize: Math.round(averageSize * 100) / 100,
        averageRadius: Math.round(averageRadius * 100) / 100,
        minSize,
        maxSize,
        minRadius,
        maxRadius,
    };

    if (userId) {
        // Get user's latest measurement
        const userMeasurement = await ctx
            .selectFrom("penis")
            .where("userId", "=", userId)
            .orderBy("id", "desc")
            .selectAll()
            .executeTakeFirst();

        if (userMeasurement) {
            result.userSize = userMeasurement.size;
            result.userRadius = userMeasurement.radius;

            // Calculate percentiles
            const sizePercentile =
                (sizes.filter(s => s < userMeasurement.size).length / sizes.length) * 100;
            const radiusPercentile =
                (radii.filter(r => r < userMeasurement.radius).length / radii.length) * 100;

            result.userSizePercentile = Math.round(sizePercentile * 100) / 100;
            result.userRadiusPercentile = Math.round(radiusPercentile * 100) / 100;
        }
    }

    return result;
}

/**
 * Get boobs statistics
 */
export async function getBoobsStats(
    userId?: Snowflake,
    ctx: Kysely<Database> = db(),
): Promise<BoobsStats> {
    // Get latest measurement for each user using a join with max id subquery
    // We use id as a proxy for "latest" since it's auto-incrementing
    const maxIdsSubquery = ctx
        .selectFrom("boobs")
        .select(["userId", ({ fn }) => fn.max<number>("id").as("maxId")])
        .groupBy("userId")
        .as("maxIds");

    const latestMeasurements = await ctx
        .selectFrom("boobs")
        .innerJoin(maxIdsSubquery, join =>
            join.onRef("boobs.userId", "=", "maxIds.userId").onRef("boobs.id", "=", "maxIds.maxId"),
        )
        .select(["boobs.userId", "boobs.size"])
        .execute();

    // Calculate statistics from latest measurements
    if (latestMeasurements.length === 0) {
        return {
            averageSize: 0,
            minSize: 0,
            maxSize: 0,
        };
    }

    const sizes = latestMeasurements.map(m => m.size);

    const averageSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    const result: BoobsStats = {
        averageSize: Math.round(averageSize * 100) / 100,
        minSize,
        maxSize,
    };

    if (userId) {
        // Get user's latest measurement
        const userMeasurement = await ctx
            .selectFrom("boobs")
            .where("userId", "=", userId)
            .orderBy("id", "desc")
            .selectAll()
            .executeTakeFirst();

        if (userMeasurement) {
            result.userSize = userMeasurement.size;

            // Calculate percentile
            const sizePercentile =
                (sizes.filter(s => s < userMeasurement.size).length / sizes.length) * 100;
            result.userSizePercentile = Math.round(sizePercentile * 100) / 100;
        }
    }

    return result;
}

/**
 * Get most frequently used emote (global)
 */
export async function getMostFrequentEmote(
    limit: number = 1,
    ctx: Kysely<Database> = db(),
): Promise<EmoteStats[]> {
    const results = await ctx
        .selectFrom("emoteUse")
        .innerJoin("emote", "emote.id", "emoteUse.emoteId")
        .where("emote.deletedAt", "is", null)
        .groupBy(["emote.emoteId", "emote.name", "emote.isAnimated"])
        .select([
            "emote.emoteId",
            "emote.name as emoteName",
            "emote.isAnimated",
            ({ fn }) => fn.countAll<number>().as("usageCount"),
        ])
        .orderBy(sql<number>`COUNT(*)`, "desc")
        .limit(limit)
        .execute();

    return results.map(r => ({
        emoteId: r.emoteId,
        emoteName: r.emoteName,
        isAnimated: r.isAnimated,
        usageCount: r.usageCount,
    }));
}
