/**
 * T034: Logging Utilities
 *
 * Simple logging for CRUD operations.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

let currentLevel: LogLevel = LogLevel.INFO;

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Log a debug message
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.DEBUG) {
    console.debug(formatMessage('DEBUG', message, context));
  }
}

/**
 * Log an info message
 */
export function info(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.INFO) {
    console.info(formatMessage('INFO', message, context));
  }
}

/**
 * Log a warning message
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.WARN) {
    console.warn(formatMessage('WARN', message, context));
  }
}

/**
 * Log an error message
 */
export function error(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.ERROR) {
    console.error(formatMessage('ERROR', message, context));
  }
}

/**
 * Create a child logger with prefixed messages
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      debug(`[${prefix}] ${message}`, context),
    info: (message: string, context?: Record<string, unknown>) =>
      info(`[${prefix}] ${message}`, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      warn(`[${prefix}] ${message}`, context),
    error: (message: string, context?: Record<string, unknown>) =>
      error(`[${prefix}] ${message}`, context),
  };
}
