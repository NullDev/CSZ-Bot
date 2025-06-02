import { mkdir } from "node:fs/promises";

import { pino, type LoggerOptions } from "pino";

const logLevel = process.env.LOG_LEVEL ?? "info";
const nodeEnv = process.env.NODE_ENV ?? "development";

const logDir = "logs";

const usesLogDir = nodeEnv === "production";
if (usesLogDir) {
    await mkdir(logDir, { recursive: true });
}

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
    test: {
        level: logLevel,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: false,
                ignore: "pid,hostname",
            },
        },
    },
    production: {
        level: logLevel,
        transport: {
            targets: [
                {
                    target: "pino-pretty",
                    options: {
                        colorize: true,
                        ignore: "pid,hostname",
                    },
                },
                {
                    target: "pino/file",
                    options: {
                        destination: `${logDir}/error.log`,
                    },
                },
            ],
        },
    },
} as Record<string, LoggerOptions>;

const loggingConfig = loggingConfigs[nodeEnv];

export default pino(loggingConfig);
