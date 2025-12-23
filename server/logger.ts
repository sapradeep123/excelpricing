import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Helper functions for structured logging
export const logInfo = (message: string, data?: Record<string, any>) => {
  logger.info(data || {}, message);
};

export const logError = (message: string, error?: Error | unknown, data?: Record<string, any>) => {
  logger.error({ ...data, error: error instanceof Error ? error.message : error }, message);
};

export const logWarn = (message: string, data?: Record<string, any>) => {
  logger.warn(data || {}, message);
};

export const logDebug = (message: string, data?: Record<string, any>) => {
  logger.debug(data || {}, message);
};
