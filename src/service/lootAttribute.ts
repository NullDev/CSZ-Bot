import {LootAttribute} from "@/storage/lootAttributes.js";

export enum LootAttributeTypeId {
    NORMAL,
    SELTEN,
    SEHRSELTEN,
    VERSCHIMMELT,
    VERSTRAHLT,
    VERDRECKT,

}

export const lootAttributesList: LootAttribute[] = [
    {
        id: LootAttributeTypeId.NORMAL,
        name: "Normal",
        color: 0,
        initialDropWeight: 90,
        visible: false
    },
    {
        id: LootAttributeTypeId.SELTEN,
        name: "Selten",
        color: 0,
        initialDropWeight: 10,
        visible: true
    },
    {
        id: LootAttributeTypeId.SEHRSELTEN,
        name: "Sehr Selten",
        color: 0,
        initialDropWeight: 1,
        visible: true
    },
    {
        id: LootAttributeTypeId.VERSCHIMMELT,
        name: "Verschimmelt",
        color: 0,
        initialDropWeight: 1,
        visible: true
    }
    , {
        id: LootAttributeTypeId.VERSTRAHLT,
        name: "Verstrahlt",
        color: 0xFF_FF_FF,
        visible: true
    }, {
        id: LootAttributeTypeId.VERDRECKT,
        name: "Verdreckt",
        color: 0,
        visible: true
    }
];
