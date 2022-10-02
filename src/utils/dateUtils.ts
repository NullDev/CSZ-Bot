
const timeFormatter = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
});

export function formatTime(time: Date) {
    return timeFormatter.format(time);
}
