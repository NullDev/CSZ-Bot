import { Message, Client } from "discord.js";
import { SpecialCommand, CommandResult } from "../command";

export class NixOsCommand implements SpecialCommand {
    name: string = "NixOS";
    description: string = "Nix Command - NixOS, nix Problem";
    randomness = 0.4;
    cooldownTime = 300000;

    matches(message: Message<boolean>): boolean {
        return message.content.toLowerCase().includes("nix");
    }

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<CommandResult> {
        const nixEmote = message.guild?.emojis.cache.find(e => e.name === "nixos");
        if(nixEmote) {
            await message.react(nixEmote);
            return;
        }
        throw new Error("Nix Emote not found");
    }
}
