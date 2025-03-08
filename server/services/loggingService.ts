import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir);
}

// Create different log streams
const infoStream = createWriteStream(join(logsDir, 'info.log'), { flags: 'a' });
const errorStream = createWriteStream(join(logsDir, 'error.log'), { flags: 'a' });
const debugStream = createWriteStream(join(logsDir, 'debug.log'), { flags: 'a' });
const authStream = createWriteStream(join(logsDir, 'auth.log'), { flags: 'a' });

enum LogLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  AUTH = 'AUTH'
}

interface LogContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] ${level}: ${message} ${contextStr}\n`;
  }

  info(message: string, context?: LogContext) {
    const logMessage = this.formatMessage(LogLevel.INFO, message, context);
    infoStream.write(logMessage);
    console.log(logMessage.trim());
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      stack: error?.stack
    };
    const logMessage = this.formatMessage(LogLevel.ERROR, message, errorContext);
    errorStream.write(logMessage);
    console.error(logMessage.trim());
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      const logMessage = this.formatMessage(LogLevel.DEBUG, message, context);
      debugStream.write(logMessage);
      console.debug(logMessage.trim());
    }
  }

  warn(message: string, context?: LogContext) {
    const logMessage = this.formatMessage(LogLevel.INFO, `WARNING: ${message}`, context);
    infoStream.write(logMessage);
    console.warn(logMessage.trim());
  }

  auth(message: string, context?: LogContext) {
    const logMessage = this.formatMessage(LogLevel.AUTH, message, context);
    authStream.write(logMessage);
    console.log(logMessage.trim());
  }

  // Request logging
  logRequest(req: any, res: any, next: any) {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    this.debug('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    // Attach requestId to the request object for tracking
    req.requestId = requestId;
    next();
  }
}

export const logger = new Logger();
