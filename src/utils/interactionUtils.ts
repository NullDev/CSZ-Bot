import type { CacheType, ChatInputCommandInteraction, CommandInteraction } from "discord.js";

export function ensureChatInputCommand<Cached extends CacheType = CacheType>(
    interaction: CommandInteraction<Cached>,
): ChatInputCommandInteraction<Cached> {
    if (!interaction.isChatInputCommand()) {
        throw new Error("Interaction is not a chat input command");
    }
    return interaction;
}

export function defer(action: () => unknown | Promise<unknown>): AsyncDisposable {
    return {
        async [Symbol.asyncDispose]() {
            await action();
        },
    };
}
