/**
 * Structured Logger using Pino
 * Provides performance-optimized, structured JSON logging
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Automatic request correlation IDs
 * - Sensitive data redaction
 * - Pretty printing in development
 * - JSON output in production
 */

import pino from 'pino';
import { redactSensitiveData } from '../utils';

/**
 * Logger configuration based on environment
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Create Pino logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Disable logging in test environment
  enabled: !isTest,
  
  // Pretty print in development, JSON in production
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  
  // Base metadata included in all logs
  base: {
    env: process.env.NODE_ENV,
    service: 'threads-clone',
  },
  
  // Custom serializers for objects
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    remove: true, // Remove fields completely rather than replacing with [Redacted]
  },
});

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Logger context for adding metadata
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Enhanced logger with context support
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Debug level logging
   */
  debug(message: string, meta?: Record<string, unknown>) {
    logger.debug({ ...this.context, ...meta }, message);
  }

  /**
   * Info level logging
   */
  info(message: string, meta?: Record<string, unknown>) {
    logger.info({ ...this.context, ...meta }, message);
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: Record<string, unknown>) {
    logger.warn({ ...this.context, ...meta }, message);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorMeta = error instanceof Error
      ? { error: { message: error.message, stack: error.stack, name: error.name } }
      : { error };
    
    logger.error({ ...this.context, ...errorMeta, ...meta }, message);
  }

  /**
   * Fatal level logging (will exit process)
   */
  fatal(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorMeta = error instanceof Error
      ? { error: { message: error.message, stack: error.stack, name: error.name } }
      : { error };
    
    logger.fatal({ ...this.context, ...errorMeta, ...meta }, message);
  }

  /**
   * Log HTTP request
   */
  logRequest(method: string, url: string, meta?: Record<string, unknown>) {
    this.info(`${method} ${url}`, { method, url, ...meta });
  }

  /**
   * Log HTTP response
   */
  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>
  ) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](
      { ...this.context, method, url, statusCode, duration, ...meta },
      `${method} ${url} ${statusCode} - ${duration}ms`
    );
  }

  /**
   * Log authentication events
   */
  logAuth(event: 'login' | 'logout' | 'register', userId?: string, meta?: Record<string, unknown>) {
    this.info(`Authentication: ${event}`, { event, userId, ...meta });
  }

  /**
   * Log database operations
   */
  logDatabase(operation: string, collection: string, meta?: Record<string, unknown>) {
    this.debug(`Database: ${operation} on ${collection}`, { operation, collection, ...meta });
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    logger[level]({ ...this.context, ...meta }, message);
  }
}

/**
 * Create a logger instance with optional context
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger();

// Export raw Pino logger for advanced use cases
export { logger as pinoLogger };
