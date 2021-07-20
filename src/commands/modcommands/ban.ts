"use strict";

import { Guild, GuildMember, Snowflake } from "discord.js";
import { BanData } from "../../storage/model/BanData";
import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../../types";
import { isModeratorUser } from "../../utils/access";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let cron = require("node-cron");

// Utils
let log = require("../../utils/logger");
let config = require("../../utils/configHandler").getConfig();

async function banHandler(interaction: VerifiedCommandInteraction): Promise<Result> {
	const member = interaction.options.get("user")?.member as GuildMember;
	const reason = interaction.options.get("grund")?.value as string | undefined;
	const duration = interaction.options.get("dauer")?.value as number || 0;

	console.log(member);
	console.log(reason);
	console.log(duration);

    if (isModeratorUser(member) || member.user.id === interaction.user.id) {
		return { content: "Fick dich bitte.", ephemeral: true };
	}

	const oldUnbanAt = await BanData.getUnbanAt(member.id);

    if (isBanned(member) && !oldUnbanAt) {
		return { content: "Dieser User ist bereits gebannt du kek.", ephemeral: true };
	}

	const unbanAt = getUnbanAt(duration);
	const banFunction = getBanFunction(member, unbanAt);

    if (!banFunction) {
		return { content: "Eine der angegebenen Rollen für das bannen existiert nich.", ephemeral: true };
	}

    await member.send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#${config.ids.banned_channel_id}> Channel ausheulen.

Lg & xD™`
    );

    await interaction.reply({ content: `User ${member} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}` });

	await banFunction();
}

async function unbanHandler(interaction: VerifiedCommandInteraction): Promise<Result> {
	const member = interaction.options.get("user")?.member as GuildMember;

    if (!isBanned(member)) {
		return { content: "Dieser User ist nicht gebannt du kek.", ephemeral: true };
	}

	const unbanFunction = getUnbanFunction(member);

    if (!unbanFunction) {
		return { content: "Eine der angegebenen Rollen für das bannen existiert nich.", ephemeral: true };
	}

	await unbanFunction();

    await member.send("Glückwunsch! Du wurdest von der Coding Shitpost Zentrale entbannt. Und jetzt benimm dich.");

    return { content: `User ${member} wurde entbannt!` };
}

export function startCron(guild: Guild) {
    cron.schedule("* * * * *", async () => {
		const bans = await BanData.findAll();

		for (let banData of bans) {
			if (banData.unbanAt !== 0 && banData.unbanAt < Date.now()) {
				const member = guild.members.cache.get(banData.userId as Snowflake);

				if (member) {
					const unbanFunction = getUnbanFunction(member);

					if (unbanFunction) {
						await unbanFunction();

						await member.send("Glückwunsch! Dein Bann in der Coding Shitpost Zentrale ist beendet.");
					}
				}

				BanData.removeBan(banData.userId as Snowflake);
			}
		}
    });
}

export function isBanned(member: GuildMember): boolean {
	return member.roles.cache.some(r => r.id === config.ids.banned_role_id);
}

function getRoleAssigner(member: GuildMember, roleId: Snowflake, bannedRoleId: Snowflake, banned: boolean): (() => Promise<void>) | undefined {
	const role = member.guild.roles.cache.find(role => role.id === roleId);
    const bannedRole = member.guild.roles.cache.find(role => role.id === bannedRoleId);

	if (!role || !bannedRole) {
		return undefined;
	}

	const hasRole = member.roles.cache.some(r => r.id === roleId);
	const hasBannedRole = member.roles.cache.some(r => r.id === bannedRoleId);

	if ((hasRole && !banned) || (hasBannedRole && banned)) {
		return undefined;
	}

	if (hasRole || hasBannedRole) {
		return async function() {
			await member.roles.add(banned ? bannedRole : role);
			await member.roles.remove(banned ? role : bannedRole);
		};
	}

	return async function () { };
}

// this function is transactional (only performs ban if all required roles are found)
function getRoleAssigners(member: GuildMember, banned: boolean): (() => Promise<void>)[] | undefined {
	const defaultAssigner = getRoleAssigner(member, config.ids.default_role_id, config.ids.banned_role_id, banned);
	const trustedAssigner = getRoleAssigner(member, config.ids.trusted_role_id, config.ids.trusted_banned_role_id, banned);
	const gruendervaeterAssigner = getRoleAssigner(member, config.ids.gruendervaeter_role_id, config.ids.gruendervaeter_banned_role_id, banned);

	if (!defaultAssigner || !trustedAssigner || !gruendervaeterAssigner) {
        log.error("Ban: (some) roles are missing and/or wrongly assigned");
		return undefined;
	}

	return [
		defaultAssigner,
		trustedAssigner,
		gruendervaeterAssigner
	];
}

export function getBanFunction(member: GuildMember, unbanAt: number): (() => Promise<void>) | undefined {
	const roleAssigners = getRoleAssigners(member, true);

	if (!roleAssigners) {
		return undefined;
	}

	return async function() {
		for (const roleAssigner of roleAssigners) {
			await roleAssigner();
		}

		await BanData.setBan(member.id, unbanAt);
	}
}

export function getUnbanFunction(member: GuildMember): (() => Promise<void>) | undefined {
	const roleAssigners = getRoleAssigners(member, false);

	if (!roleAssigners) {
		return undefined;
	}

	return async function() {
		for (const roleAssigner of roleAssigners) {
			await roleAssigner();
		}

		await BanData.removeBan(member.id);
	}
}

export function getUnbanAt(duration?: number): number {
	let unbanAt = duration ?? 0; // 0 = never

    if (!Number.isInteger(duration) || !isFinite(unbanAt)) {
		unbanAt = 0; // DO NOT HACK ME U FUCKR
    }

	if (unbanAt === 0) {
		return unbanAt;
	}

	if (unbanAt < 0) {
		unbanAt *= -1 * 2; // xd
	}

	return Date.now() + (unbanAt * 1000/*ms*/ * 3600/*s*/);
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler: banHandler,
        data: {
            name: "ban",
            description: "Bannt einen User indem er ihn von allen Channels ausschließt",
			options: [
                {
                    name: "user",
                    type: "USER",
                    description: "Wer gebannert werden soll",
                    required: true
                },
				{
					name: "grund",
					type: "STRING",
					description: "ohgodwhy"
				},
				{
					name: "dauer",
					type: "INTEGER",
                    description: "Banndauer (default = unendlich)"
				}
            ]
        }
    },
    {
        handler: unbanHandler,
        data: {
            name: "unban",
            description: "Entbannt einen User womit er alle Channel wieder sehen kann",
			options: [
                {
                    name: "user",
                    type: "USER",
                    description: "Wer rehabilitiert werden soll",
                    required: true
                }
            ]
        }
    }
];
