import { Message, Client } from "discord.js";
import { SpecialCommand, CommandResult } from "../command";

export class NixOsCommand implements SpecialCommand {
    name: string = "NixOS";
    description: string = "Nix Command - NixOS, nix Problem";
    pattern: RegExp = /(^|\s+)nix($|\s+)/i;
    randomness = 0.4;
    cooldownTime = 300000;

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<CommandResult> {
        const nixEmote = message.guild?.emojis.cache.find(e => e.name === "nixos");
        if(nixEmote) {
            await message.react(nixEmote);
            return;
        }
        throw new Error("Nix Emote not found");
    }
}
