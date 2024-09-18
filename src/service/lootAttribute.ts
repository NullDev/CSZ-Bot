import type { LootAttribute } from "@/storage/lootAttributes.js";

export enum LootAttributeTypeId {
    NORMAL = 0,
    SELTEN = 1,
    SEHR_SELTEN = 2,
    VERSCHIMMELT = 3,
    VERSTRAHLT = 4,
    VERDRECKT = 5,
}

export const lootAttributesList: LootAttribute[] = [
    {
        id: LootAttributeTypeId.NORMAL,
        displayName: "Normal",
        shortDisplay: "⭐",
        color: 0,
        initialDropWeight: 90,
        visible: false,
    },
    {
        id: LootAttributeTypeId.SELTEN,
        displayName: "Selten",
        shortDisplay: "🌟",
        color: 0,
        initialDropWeight: 10,
        visible: true,
    },
    {
        id: LootAttributeTypeId.SEHR_SELTEN,
        displayName: "Sehr Selten",
        shortDisplay: "✨",
        color: 0,
        initialDropWeight: 1,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERSCHIMMELT,
        displayName: "Verschimmelt",
        shortDisplay: "🤢",
        color: 0,
        initialDropWeight: 1,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERSTRAHLT,
        displayName: "Verstrahlt",
        shortDisplay: "☢️",
        color: 0xff_ff_ff,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERDRECKT,
        displayName: "Verdreckt",
        shortDisplay: null,
        color: 0,
        visible: true,
    },
];
