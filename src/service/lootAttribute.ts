import type { LootAttribute } from "@/storage/lootAttribute.js";

export enum LootAttributeClassId {
    OTHER = 0,
    RARITY = 1,
}

export enum LootAttributeKindId {
    NORMAL = 0,
    SELTEN = 1,
    SEHR_SELTEN = 2,
    VERSTRAHLT = 3,
    // VERSCHIMMELT = 4,
    // VERDRECKT = 5,
}

/**
 * @remarks The index of an item must be equal to the `LootAttributeKindId` enum value.
 */
export const lootAttributes = [
    {
        id: LootAttributeKindId.NORMAL,
        classId: LootAttributeClassId.RARITY,
        displayName: "Normal",
        shortDisplay: "⭐",
        color: 0,
        initialDropWeight: 90,
        visible: false,
    },
    {
        id: LootAttributeKindId.SELTEN,
        classId: LootAttributeClassId.RARITY,
        displayName: "Selten",
        shortDisplay: "🌟",
        color: 0,
        initialDropWeight: 10,
        visible: true,
    },
    {
        id: LootAttributeKindId.SEHR_SELTEN,
        classId: LootAttributeClassId.RARITY,
        displayName: "Sehr Selten",
        shortDisplay: "✨",
        color: 0,
        initialDropWeight: 1,
        visible: true,
    },
    {
        id: LootAttributeKindId.VERSTRAHLT,
        classId: LootAttributeClassId.OTHER,
        displayName: "Verstrahlt",
        shortDisplay: "☢️",
        color: 0xff_ff_ff,
        visible: true,
    },
    /*
    {
        id: LootAttributeTypeId.VERSCHIMMELT,
        classId: LootAttributeClassId.OTHER,
        displayName: "Verschimmelt",
        shortDisplay: "🤢",
        color: 0,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERDRECKT,
        classId: LootAttributeClassId.OTHER,
        displayName: "Verdreckt",
        shortDisplay: null,
        color: 0,
        visible: true,
    },
    */
] satisfies LootAttribute[];
