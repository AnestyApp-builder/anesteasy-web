type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  info(message: string, data?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown) {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, error?: unknown) {
    const errorData = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
    } : error;
    console.error(this.formatMessage('error', message, errorData));
  }

  debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();
