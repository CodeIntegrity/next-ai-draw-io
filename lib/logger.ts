/**
 * Configurable logging utility
 * Supports log levels: error, warn, info, debug
 * Controlled by LOG_LEVEL environment variable
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Define the priority of each log level (higher number = lower priority)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Get the configured log level from environment variable
const getConfiguredLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  
  // Validate the environment variable
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel;
  }
  
  // Default to error level (minimal logging)
  return 'error';
};

const currentLogLevel = getConfiguredLogLevel();

/**
 * Check if a log level should be displayed based on current configuration
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
};

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level: LogLevel, message: string, ...args: any[]): [string, ...any[]] => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return [`${prefix} ${message}`, ...args];
};

/**
 * Logger object with methods for each log level
 */
export const logger = {
  /**
   * Error level - always shown regardless of LOG_LEVEL setting
   */
  error: (message: string, ...args: any[]) => {
    if (shouldLog('error')) {
      console.error(...formatMessage('error', message, ...args));
    }
  },

  /**
   * Warning level - shown when LOG_LEVEL is warn, info, or debug
   */
  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(...formatMessage('warn', message, ...args));
    }
  },

  /**
   * Info level - shown when LOG_LEVEL is info or debug
   */
  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) {
      console.log(...formatMessage('info', message, ...args));
    }
  },

  /**
   * Debug level - shown only when LOG_LEVEL is debug
   */
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) {
      console.log(...formatMessage('debug', message, ...args));
    }
  },

  /**
   * Get current log level
   */
  getLevel: (): LogLevel => currentLogLevel,

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled: (): boolean => shouldLog('debug'),

  /**
   * Check if info logging is enabled
   */
  isInfoEnabled: (): boolean => shouldLog('info'),
};

export default logger;