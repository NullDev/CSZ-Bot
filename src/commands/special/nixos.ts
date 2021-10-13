import { Message, Client } from "discord.js";
import { SpecialCommand } from "../command";

export class NixOsCommand implements SpecialCommand {
    name: string = "NixOS";
    description: string = "Nix Command - NixOS, nix Problem";
    pattern: RegExp = /(^|\s+)nix($|\s+)/i;
    randomness = 0.4;

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<unknown> {
        const nixEmote = message.guild?.emojis.cache.find(e => e.name === "nixos");
        if(nixEmote) {
            return message.react(nixEmote);
        }
        throw new Error("Nix Emote not found");
    }
}
