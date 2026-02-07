/**
 * T034: Logging Utilities
 *
 * Simple logging for CRUD operations.
 */

/**
 * Log level enumeration controlling which messages are output.
 *
 * @remarks
 * Log levels are ordered from most verbose (DEBUG = 0) to least verbose (SILENT = 4).
 * Setting the log level to a specific value will output messages at that level and above.
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
 * Sets the current logging threshold level.
 *
 * Messages with a level lower than the threshold will be suppressed.
 * For example, setting the level to WARN will suppress DEBUG and INFO messages.
 *
 * @param level - The minimum log level to output
 * @returns void
 *
 * @example
 * ```typescript
 * import { setLogLevel, LogLevel, debug, info } from './logger';
 *
 * // Only show warnings and errors
 * setLogLevel(LogLevel.WARN);
 *
 * debug('This will be suppressed');
 * info('This will also be suppressed');
 *
 * // Show all messages including debug
 * setLogLevel(LogLevel.DEBUG);
 * ```
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Retrieves the current logging threshold level.
 *
 * Useful for temporarily changing the log level and restoring it later,
 * or for conditional logic based on the current verbosity setting.
 *
 * @returns The current LogLevel threshold
 *
 * @example
 * ```typescript
 * import { getLogLevel, setLogLevel, LogLevel } from './logger';
 *
 * // Save current level
 * const previousLevel = getLogLevel();
 *
 * // Temporarily enable verbose logging
 * setLogLevel(LogLevel.DEBUG);
 * // ... perform operations ...
 *
 * // Restore previous level
 * setLogLevel(previousLevel);
 * ```
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Formats a log message with ISO timestamp and level prefix.
 *
 * @param level - The log level label (e.g., 'DEBUG', 'INFO')
 * @param message - The message to format
 * @param context - Optional contextual data to append as JSON
 * @returns The formatted log string
 */
function formatMessage(level: string, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Logs a debug-level message.
 *
 * Debug messages are the most verbose and are typically used for detailed
 * diagnostic information during development or troubleshooting. Only output
 * when the log level is set to DEBUG.
 *
 * @param message - The debug message to log
 * @param context - Optional object containing additional contextual data to include in the log output
 * @returns void
 *
 * @example
 * ```typescript
 * import { debug, setLogLevel, LogLevel } from './logger';
 *
 * setLogLevel(LogLevel.DEBUG);
 *
 * // Simple debug message
 * debug('Processing memory file');
 *
 * // Debug message with context
 * debug('Memory loaded', {
 *   memoryId: 'abc123',
 *   fileSize: 1024,
 *   loadTimeMs: 15
 * });
 * // Output: [2024-01-15T10:30:00.000Z] [DEBUG] Memory loaded {"memoryId":"abc123","fileSize":1024,"loadTimeMs":15}
 * ```
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.DEBUG) {
    console.debug(formatMessage('DEBUG', message, context));
  }
}

/**
 * Logs an info-level message.
 *
 * Info messages are used for general operational information such as
 * successful operations, state changes, or significant events. This is
 * the default log level.
 *
 * @param message - The informational message to log
 * @param context - Optional object containing additional contextual data to include in the log output
 * @returns void
 *
 * @example
 * ```typescript
 * import { info } from './logger';
 *
 * // Simple info message
 * info('Memory plugin initialised');
 *
 * // Info message with context
 * info('Memory created successfully', {
 *   memoryId: 'mem-789',
 *   type: 'learning',
 *   tags: ['typescript', 'patterns']
 * });
 * // Output: [2024-01-15T10:30:00.000Z] [INFO] Memory created successfully {"memoryId":"mem-789","type":"learning","tags":["typescript","patterns"]}
 * ```
 */
export function info(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.INFO) {
    console.info(formatMessage('INFO', message, context));
  }
}

/**
 * Logs a warning-level message.
 *
 * Warning messages indicate potential issues or unexpected conditions that
 * do not prevent the operation from completing but may warrant attention.
 * Examples include deprecated usage, missing optional configuration, or
 * recoverable errors.
 *
 * @param message - The warning message to log
 * @param context - Optional object containing additional contextual data to include in the log output
 * @returns void
 *
 * @example
 * ```typescript
 * import { warn } from './logger';
 *
 * // Simple warning
 * warn('Memory file not found, creating new one');
 *
 * // Warning with context
 * warn('Duplicate memory detected', {
 *   existingId: 'mem-123',
 *   newId: 'mem-456',
 *   resolution: 'skipped'
 * });
 * // Output: [2024-01-15T10:30:00.000Z] [WARN] Duplicate memory detected {"existingId":"mem-123","newId":"mem-456","resolution":"skipped"}
 * ```
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.WARN) {
    console.warn(formatMessage('WARN', message, context));
  }
}

/**
 * Logs an error-level message.
 *
 * Error messages indicate failures or problems that prevented an operation
 * from completing successfully. These should be reserved for genuine errors
 * that require attention or investigation.
 *
 * @param message - The error message to log
 * @param context - Optional object containing additional contextual data such as error details, stack traces, or failed operation parameters
 * @returns void
 *
 * @example
 * ```typescript
 * import { error } from './logger';
 *
 * // Simple error message
 * error('Failed to save memory');
 *
 * // Error with context including error details
 * try {
 *   await saveMemory(memory);
 * } catch (err) {
 *   error('Memory save failed', {
 *     memoryId: memory.id,
 *     errorMessage: err instanceof Error ? err.message : String(err),
 *     attemptNumber: 3
 *   });
 * }
 * // Output: [2024-01-15T10:30:00.000Z] [ERROR] Memory save failed {"memoryId":"mem-123","errorMessage":"ENOSPC: no space left","attemptNumber":3}
 * ```
 */
export function error(message: string, context?: Record<string, unknown>): void {
  if (currentLevel <= LogLevel.ERROR) {
    console.error(formatMessage('ERROR', message, context));
  }
}

/**
 * Logger interface returned by createLogger.
 *
 * @remarks
 * Provides the same logging methods as the module-level functions,
 * but with messages automatically prefixed with the logger's namespace.
 */
interface PrefixedLogger {
  /** Log a debug message with the logger prefix */
  debug: (message: string, context?: Record<string, unknown>) => void;
  /** Log an info message with the logger prefix */
  info: (message: string, context?: Record<string, unknown>) => void;
  /** Log a warning message with the logger prefix */
  warn: (message: string, context?: Record<string, unknown>) => void;
  /** Log an error message with the logger prefix */
  error: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Creates a child logger with a namespace prefix.
 *
 * Useful for creating loggers scoped to specific modules, components, or
 * operations. All messages logged through the child logger will be
 * automatically prefixed with the specified namespace, making it easier
 * to filter and identify log sources.
 *
 * @param prefix - The namespace prefix to prepend to all log messages (e.g., 'MemoryStore', 'GraphBuilder')
 * @returns A PrefixedLogger object with debug, info, warn, and error methods
 *
 * @example
 * ```typescript
 * import { createLogger, setLogLevel, LogLevel } from './logger';
 *
 * // Create a logger for a specific module
 * const memoryStoreLogger = createLogger('MemoryStore');
 *
 * memoryStoreLogger.info('Initialising store');
 * // Output: [2024-01-15T10:30:00.000Z] [INFO] [MemoryStore] Initialising store
 *
 * memoryStoreLogger.debug('Loading memories from disk', { count: 42 });
 * // Output: [2024-01-15T10:30:00.000Z] [DEBUG] [MemoryStore] Loading memories from disk {"count":42}
 *
 * // Create multiple loggers for different components
 * const graphLogger = createLogger('GraphBuilder');
 * const searchLogger = createLogger('SearchEngine');
 *
 * graphLogger.info('Building relationship graph');
 * searchLogger.info('Indexing memories for search');
 * ```
 */
export function createLogger(prefix: string): PrefixedLogger {
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
