import * as winston from "winston";

// This is pretty much the default config taken from:
// https://www.npmjs.com/package/winston

// Could be loaded via process.env, but honestly: who cares?
const loggingDir = "logs";

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: `${loggingDir}/error.log`, level: "error" }),
        new winston.transports.File({ filename: `${loggingDir}/combined.log` })
    ]
});

// if (process.env.NODE_ENV !== "production") {
logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`)
    )
}));
// }

export default logger;
