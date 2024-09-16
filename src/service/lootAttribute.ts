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
        color: 0,
        initialDropWeight: 90,
        visible: false,
    },
    {
        id: LootAttributeTypeId.SELTEN,
        displayName: "Selten",
        color: 0,
        initialDropWeight: 10,
        visible: true,
    },
    {
        id: LootAttributeTypeId.SEHR_SELTEN,
        displayName: "Sehr Selten",
        color: 0,
        initialDropWeight: 1,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERSCHIMMELT,
        displayName: "Verschimmelt",
        color: 0,
        initialDropWeight: 1,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERSTRAHLT,
        displayName: "Verstrahlt",
        color: 0xff_ff_ff,
        visible: true,
    },
    {
        id: LootAttributeTypeId.VERDRECKT,
        displayName: "Verdreckt",
        color: 0,
        visible: true,
    },
];
