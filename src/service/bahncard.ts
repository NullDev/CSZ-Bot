import type { User } from "discord.js";

import type { BotContext } from "@/context.js";
import type { Loot } from "@/storage/db/model.js";
import type { LootTemplate } from "src/storage/loot.js";

export async function drawBahncardImage(
    context: BotContext,
    owner: User,
    template: LootTemplate,
    loot: Loot,
): Promise<Buffer> {}
