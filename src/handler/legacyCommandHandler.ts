import type { BotContext } from "../context.js";
import * as banService from "../service/banService.js";
import * as commandService from "../service/commandService.js";
import { isMessageInBotSpam } from "../utils/channelUtils.js";
import log from "@log";

/** Passes commands to the correct executor */
export default async function (message: commandService.ProcessableMessage, context: BotContext) {
    if (message.author.bot) {
        return;
    }

    if (context.roleGuard.hasBotDenyRole(message.member) && !isMessageInBotSpam(context, message)) {
        await message.member.send(
            "Du hast dich scheinbar beschissen verhalten und darfst daher keine Befehle in diesem Channel ausführen!",
        );
        return;
    }

    const { type, prefix, commandName, args } = commandService.parseLegacyMessageParts(
        context,
        message,
    );
    if (!commandName) {
        return;
    }

    const invokedCommand = await commandService.loadLegacyCommandByName(context, commandName, type);

    if (!invokedCommand) {
        log.warn(`Command "${commandName}" not found`);
        return;
    }

    const { name, definition } = invokedCommand;
    console.assert(!!name, "name must be non-falsy");
    console.assert(!!definition, "definition must be non-falsy");
    console.assert(!!definition.run, "definition.run must be non-falsy");
    console.assert(!!definition.description, "definition.description must be non-falsy");

    if (type === "mod" && !message.member.roles.cache.some(r => context.moderatorRoles.has(r.id))) {
        log.warn(
            `User "${message.author.tag}" (${message.author}) tried mod command "${prefix}${name}" and was denied`,
        );

        if (message.member.roles.cache.some(r => r.id === context.roles.banned.id)) {
            await message.reply({
                content: "Da haste aber Schwein gehabt",
            });
            return;
        }

        await banService.banUser(context, message.member, message.member, "Lol", false, 0.08);

        await message.reply({
            content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`,
        });
        return;
    }

    if (type === "mod") {
        log.info(
            `User "${message.author.tag}" (${message.author}) performed mod-command: ${prefix}${name}`,
        );
    } else {
        log.info(
            `User "${message.author.tag}" (${message.author}) performed command: ${prefix}${name}`,
        );
    }

    let response = undefined;
    try {
        response = await definition.run(message, args, context);
    } catch (err) {
        log.error(err, "Error");
        await message.reply({
            content: "Sorry, irgendwas ist schief gegangen! =(",
        });
        return;
    }

    if (response) {
        await message.reply({
            content: response,
        });
    }
}
