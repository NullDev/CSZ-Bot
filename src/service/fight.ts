import {
    type APIEmbed,
    APIEmbedField,
    type BooleanCache,
    type CacheType,
    type InteractionResponse
} from "discord.js";
import type {JSONEncodable} from "@discordjs/util";
import {setTimeout} from "node:timers/promises";
import {BaseEntity, Entity} from "@/service/fightData.js";
