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
