import { pino, type LoggerOptions } from "pino";

const logLevel = process.env.LOG_LEVEL ?? "info";

const nodeEnv = process.env.NODE_ENV ?? "development";

const loggingConfigs = {
    development: {
        level: logLevel,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                ignore: "pid,hostname",
            },
        },
    },
    production: {
        level: logLevel,
    },
} as Record<string, LoggerOptions>;

const loggingConfig = loggingConfigs[nodeEnv];

export default pino(loggingConfig);
