import { ContainerBuilder, MessageFlags } from "discord.js";
import type { BotContext } from "#context.ts";

export async function sendTrichterUnser(ctx: BotContext) {
    const trichterEmote = ctx.guild.emojis.cache.find(value => value.name === "trichter");
    if (!trichterEmote) {
        return;
    }

    await ctx.textChannels.hauptchat.send({
        components: [
            new ContainerBuilder().addTextDisplayComponents(
                t => t.setContent(`# Das ${trichterEmote}-Unser`),
                t =>
                    t.setContent(`
Unser Bier, das im Kühlschrank steht,
geheiligt werde Dein Rausch.
Dein Kater komme,
Dein Wille geschehe,
wie im Club, so im Garten.

Unser tägliches Bier gib uns heute,
und vergib uns unseren Vollrausch,
wie auch wir vergeben den Durstigen.
Und führe uns nicht zur Vernunft,
sondern erlöse uns vom Nüchternsein.

Denn Dein ist der Trichter
und der Kater
und der Rausch
in Ewigkeit.

Prost. 🍻
`),
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
    });
}
