// fixes https://github.com/NullDev/CSZ-Bot/issues/60
// even better now with summer and winter time support!
// this is the best fix possible. I did research the whole day
// and couldn't come up with something better.

// TODO: please update this in 2031 or support will break

// https://www.schulferien.org/deutschland/zeit/zeitumstellung/
const timezoneFixes = [
    {
        summerTimeStartDay: "28.03.2021",
        winterTimeStartDay: "31.10.2021"
    },
    {
        summerTimeStartDay: "27.03.2022",
        winterTimeStartDay: "30.10.2022"
    },
    {
        summerTimeStartDay: "26.03.2023",
        winterTimeStartDay: "29.10.2023"
    },
    {
        summerTimeStartDay: "31.03.2024",
        winterTimeStartDay: "27.10.2024"
    },
    {
        summerTimeStartDay: "30.03.2025",
        winterTimeStartDay: "26.10.2025"
    },
    {
        summerTimeStartDay: "29.03.2026",
        winterTimeStartDay: "25.10.2026"
    },
    {
        summerTimeStartDay: "28.03.2027",
        winterTimeStartDay: "31.10.2027"
    },
    {
        summerTimeStartDay: "26.03.2028",
        winterTimeStartDay: "29.10.2028"
    },
    {
        summerTimeStartDay: "25.03.2029",
        winterTimeStartDay: "28.10.2029"
    },
    {
        summerTimeStartDay: "31.03.2030",
        winterTimeStartDay: "27.10.2030"
    },
    {
        summerTimeStartDay: "30.03.2031",
        winterTimeStartDay: "26.10.2031"
    }
];

function getDateFromString(input) {
    // https://stackoverflow.com/a/18849896
    const dateParts = input.split(".");
    return new Date(dateParts[2], parseInt(dateParts[1], 10) - 1, dateParts[0], 13, 37);
}

function calculateOffsetForDate(timestamp) {
    for (const pair of timezoneFixes) {
        const summerTimeStart = getDateFromString(pair.summerTimeStartDay);
        const winterTimeStart = getDateFromString(pair.winterTimeStartDay);

        if (timestamp > summerTimeStart.getTime() && timestamp < winterTimeStart.getTime()) {
            // jonas32 offset for summer time
            return -1;
        }
    }

    return 0;
}

export function getCronjobStringForHydrate(timestamp) {
    const hour = 13 + calculateOffsetForDate(timestamp);

    return `37 ${hour} * * *`;
}

