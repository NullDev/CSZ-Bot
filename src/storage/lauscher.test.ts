import { describe, test } from "node:test";

import { expect } from "expect";
import type { Artist, Track } from "@spotify/web-api-ts-sdk";

import { createDatabase, closeDatabase } from "#/storage/db/database-test-init.ts";
import { defer } from "#/utils/interactionUtils.ts";
import { getTrackMetadata, insertTrackMetadata } from "./lauscher.ts";

void describe("lauscher storage", () => {
    void test("insertTrackMetadata returns the inserted track", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);

        const artist = {
            id: "artist-1",
            name: "Artist",
            images: [{ url: "https://example.com/artist.png" }],
        } as unknown as Artist;
        const track = {
            id: "track-1",
            name: "Track",
            duration_ms: 1000,
            album: { images: [{ url: "https://example.com/album.png" }] },
            artists: [artist],
        } as unknown as Track;

        const metadata = await insertTrackMetadata(track, [artist]);

        expect(metadata).toMatchObject({
            trackId: "track-1",
            name: "Track",
            durationInMs: 1000,
            imageUrl: "https://example.com/album.png",
        });
    });

    void test("getTrackMetadata finds tracks without album image", async () => {
        await createDatabase();
        await using _ = defer(closeDatabase);

        const artist = {
            id: "artist-1",
            name: "Artist",
            images: [],
        } as unknown as Artist;
        const track = {
            id: "track-1",
            name: "Track",
            duration_ms: 1000,
            album: { images: [] },
            artists: [artist],
        } as unknown as Track;

        const inserted = await insertTrackMetadata(track, [artist]);
        expect(inserted).toMatchObject({ trackId: "track-1", imageUrl: null });

        const found = await getTrackMetadata(track);
        expect(found).toMatchObject({ trackId: "track-1", imageUrl: null });
    });
});
