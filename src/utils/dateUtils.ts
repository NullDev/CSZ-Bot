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

const durationFormatters = {
    [1000 * 60 * 60 * 24 * 365]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "year",
    }),
    [1000 * 60 * 60 * 24 * 30]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "month",
    }),
    [1000 * 60 * 60 * 24 * 7]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "week",
    }),
    [1000 * 60 * 60 * 24]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "day",
    }),
    [1000 * 60 * 60]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "hour",
    }),
    [1000 * 60]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "minute",
    }),
    [1000]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "second",
    }),
    [0]: Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "millisecond",
    }),
};

const defaultDurationFormatter = durationFormatters[1000];

/** Replacement for moment.humanize() */
export function formatDuration(seconds: number) {
    for (const [thresholdStr, formatter] of Object.entries(
        durationFormatters,
    )) {
        const threshold = Number(thresholdStr);
        if (seconds >= threshold) {
            return formatter.format(seconds / threshold);
        }
    }
    return defaultDurationFormatter.format(seconds);
}
