const timeFormatter = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
    timeStyle: "medium",
});

export function formatTime(time: Date) {
    return timeFormatter.format(time);
}

export function formatDateTime(dateTime: Date) {
    return dateTimeFormatter.format(dateTime);
}

/**
 *  Values taken from:
 * https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#sec-issanctionedsimpleunitidentifier
 */
type Unit =
    | "year"
    | "month"
    | "week"
    | "day"
    | "hour"
    | "minute"
    | "second"
    | "millisecond";

const durationFormatters = {
    year: {
        threshold: 1000 * 60 * 60 * 24 * 365,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "year",
        }),
    },
    month: {
        threshold: 1000 * 60 * 60 * 24 * 30,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "month",
        }),
    },
    week: {
        threshold: 1000 * 60 * 60 * 24 * 7,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "week",
        }),
    },
    day: {
        threshold: 1000 * 60 * 60 * 24,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "day",
        }),
    },
    hour: {
        threshold: 1000 * 60 * 60,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "hour",
        }),
    },
    minute: {
        threshold: 1000 * 60,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "minute",
        }),
    },
    second: {
        threshold: 1000,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "second",
        }),
    },
    millisecond: {
        threshold: 1,
        formatter: new Intl.NumberFormat("de-DE", {
            style: "unit",
            unit: "millisecond",
        }),
    },
} satisfies Record<Unit, { threshold: number; formatter: Intl.NumberFormat }>;

/** Replacement for moment.humanize() */
export function formatDuration(seconds: number) {
    const ms = seconds * 1000;
    for (const { threshold, formatter } of Object.values(durationFormatters)) {
        if (ms >= threshold) {
            return formatter.format(seconds / threshold);
        }
    }
    return durationFormatters.second.formatter.format(seconds);
}
