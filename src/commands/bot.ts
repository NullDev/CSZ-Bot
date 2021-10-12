import {
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import { CommandInteraction, Client } from "discord.js";
import { GitHubContributor, SingleGitHubContributorStats } from "../types";
import { ApplicationCommand } from "./command";
import { InfoCommand } from "./info";
import moment from "moment";
import * as fetch from "node-fetch";

interface WeekStats {
    author: GitHubContributor;
    stats: {
        a: number;
        d: number;
        c: number;
    };
}

interface ChartItem {
    left: string;
    value: number;
    right: string;
}

const fetchWeeklyContributionStats = async(): Promise<
    Array<SingleGitHubContributorStats>
> => {
    const result = await fetch(
        "https://api.github.com/repos/NLDev/CSC-Bot/stats/contributors",
        {
            headers: { Accept: "application/vnd.github.v3+json" },
        }
    );
    switch (result.status) {
        case 200:
            return result.json();
        case 202:
            throw new Error(
                "Calculating stats is in progress, please try again later"
            );
        default:
            throw new Error("Unexpected error fetching stats");
    }
};

const fetchContributions = async(): Promise<Array<GitHubContributor>> => {
    const result = await fetch(
        "https://api.github.com/repos/NullDev/CSC-Bot/contributors",
        {
            headers: { Accept: "application/vnd.github.v3+json" },
        }
    );
    return result.json();
};

const aggregateOverall = async(): Promise<Array<GitHubContributor>> => {
    const stats = await fetchContributions();
    return stats
        .filter((c) => c.type === "User")
        .sort((a, b) => a.contributions - b.contributions);
};

const aggregateCurrentWeek = async(): Promise<Array<WeekStats>> => {
    const stats = await fetchWeeklyContributionStats();
    const currentWeek = moment().week();
    const currentYear = moment().year();
    const isTimestampInCurrentWeek = (timestamp: number) =>
        moment.unix(timestamp).week() === currentWeek &&
        moment.unix(timestamp).year() === currentYear;

    return stats
        .filter((c) => c.author.type === "User")
        .map((c) => {
            return {
                author: c.author,
                stats: {
                    ...c.weeks.find((w) => isTimestampInCurrentWeek(w.w))!
                }
            };
        });
};

const rjust = (s: string, max: number) => {
    return " ".repeat(max - s.length) + s;
};

const buildAsciiChart = (values: Array<ChartItem>): string => {
    const maxValue = Math.max(...values.map((value) => value.value));
    const maxLengthLeft = Math.max(...values.map((value) => value.left.length));
    const fractions = ["▏", "▎", "▍", "▋", "▊", "▉"];

    return values
        .map((value) => {
            const length = (value.value * 25) / maxValue;
            const wholeNumberPart = Math.floor(length);
            const fractionalPart = length - wholeNumberPart;

            let bar = fractions[fractions.length - 1].repeat(wholeNumberPart);
            if (fractionalPart > 0) {
                bar += fractions[Math.floor(fractionalPart * fractions.length)];
            }
            return `\`${rjust(value.left.toString(), maxLengthLeft)}\` ${bar} ${
                value.right
            }`;
        })
        .join("\n");
};

const handleBotActivity = async(
    command: CommandInteraction,
    _client: Client
): Promise<unknown> => {
    const period: string = command.options.getString("period", true);

    try {
        if (period === "overall") {
            const overall: Array<ChartItem> = (await aggregateOverall()).map(
                (contributor) => {
                    return {
                        left: contributor.contributions.toString(),
                        value: contributor.contributions,
                        right: `[${contributor.login}](<${contributor.html_url}>)`
                    };
                }
            );
            return command.reply({
                content:
                    "**Gesamtstatistik junge:**\n" + buildAsciiChart(overall)
            });
        }
        else if (period === "currentWeek") {
            const week = await aggregateCurrentWeek();
            const additionChart = buildAsciiChart(
                week
                    .filter((value) => value.stats.a > 0)
                    .map((value) => {
                        return {
                            left: value.stats.a.toString(),
                            value: value.stats.a,
                            right: `[${value.author.login}](<${value.author.html_url}>)`
                        };
                    })
            );
            const deletionChart = buildAsciiChart(
                week
                    .filter((value) => value.stats.d > 0)
                    .map((value) => {
                        return {
                            left: value.stats.d.toString(),
                            value: value.stats.d,
                            right: `[${value.author.login}](<${value.author.html_url}>)`
                        };
                    })
            );
            const creationChart = buildAsciiChart(
                week
                    .filter((value) => value.stats.c > 0)
                    .map((value) => {
                        return {
                            left: value.stats.c.toString(),
                            value: value.stats.c,
                            right: `[${value.author.login}](<${value.author.html_url}>)`
                        };
                    })
            );
            return command.reply({
                content: "**Additions junge:**\n" + additionChart +
                    "\n\n" +
                    "**Deletions junge:**\n" +
                    deletionChart +
                    "\n\n" +
                    "**Creations junge:**\n" +
                    creationChart
            });
        }
    }
    catch (err) {
        return command.reply({
            content:
                "Bruder, da ist gerade was schief gegangen. Probier es später pls.",
            ephemeral: true
        });
    }
    throw new Error("Unknown Option");
};

export class BotCommand implements ApplicationCommand {
    name: string = "bot";
    description: string = "Handles Information to the bot ";
    private _info = new InfoCommand();

    get applicationCommand(): SlashCommandSubcommandsOnlyBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("info")
                    .setDescription("Zeigt Informationen über den Bot an")
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("aktivitaet")
                    .setDescription(
                        "Zeigt Informationen zu der Open Source-Aktivität des Bots an"
                    )
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName("period")
                            .setDescription("Zeitspanne")
                            .addChoice("Gesamt", "overall")
                            .addChoice("Diese Woche", "currentWeek")
                            .setRequired(true)
                    )
            );
    }

    handleInteraction(
        command: CommandInteraction,
        client: Client<boolean>
    ): Promise<unknown> {
        const subCommand = command.options.getSubcommand();

        switch (subCommand) {
            case "info":
                return this._info.handleInteraction(command, client);
            case "aktivitaet":
                return handleBotActivity(command, client);
            default:
                throw new Error("Unknown Subcommand");
        }
    }
}
