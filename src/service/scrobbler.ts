import { insertRegistration } from "@/storage/scrobbler.js";
import { GuildMember, type User } from "discord.js";

export async function setUserRegistration(user: User, activated: boolean) {
    await insertRegistration(user, activated);
}
