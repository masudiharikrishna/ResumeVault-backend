import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class WinstonLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    try {
      const logLevel = process.env.LOG_LEVEL || 'info';
      const enableLogging = process.env.ENABLE_LOGGING !== 'false';
      const logPath = process.env.LOG_PATH || './logs/META-%DATE%.log';

      const transports: winston.transport[] = [
        new winston.transports.Console({
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              const contextStr = context ? ` [${context}]` : '';
              return `[Nest] ${timestamp}   ${level}:${contextStr} ${message}`;
            }),
          ),
        }),
      ];

      if (enableLogging) {
        transports.push(
          new DailyRotateFile({
            level: logLevel,
            filename: logPath,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        );
      }

      this.logger = winston.createLogger({
        level: logLevel,
        transports,
      });
    } catch (error) {
      console.error('Failed to initialize WinstonLogger, falling back to console:', error);
    }
  }

  log(message: any, ...optionalParams: any[]) {
    try {
      if (this.logger) {
        const context = optionalParams[optionalParams.length - 1];
        this.logger.info(message, { context: typeof context === 'string' ? context : undefined });
      } else {
        console.log(message, ...optionalParams);
      }
    } catch (e) {
      console.log(message, ...optionalParams);
    }
  }

  error(message: any, ...optionalParams: any[]) {
    try {
      if (this.logger) {
        let stack: string | undefined;
        let context: string | undefined;

        if (optionalParams.length > 0) {
          if (typeof optionalParams[0] === 'string') {
            stack = optionalParams[0];
            if (optionalParams.length > 1 && typeof optionalParams[1] === 'string') {
              context = optionalParams[1];
            }
          } else {
            stack = optionalParams[0]?.stack;
            context = optionalParams[0]?.context;
          }
        }

        this.logger.error(message, { stack, context });
      } else {
        console.error(message, ...optionalParams);
      }
    } catch (e) {
      console.error(message, ...optionalParams);
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    try {
      if (this.logger) {
        const context = optionalParams[optionalParams.length - 1];
        this.logger.warn(message, { context: typeof context === 'string' ? context : undefined });
      } else {
        console.warn(message, ...optionalParams);
      }
    } catch (e) {
      console.warn(message, ...optionalParams);
    }
  }

  debug(message: any, ...optionalParams: any[]) {
    try {
      if (this.logger) {
        const context = optionalParams[optionalParams.length - 1];
        this.logger.debug(message, { context: typeof context === 'string' ? context : undefined });
      } else {
        console.debug(message, ...optionalParams);
      }
    } catch (e) {
      console.debug(message, ...optionalParams);
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    try {
      if (this.logger) {
        const context = optionalParams[optionalParams.length - 1];
        this.logger.verbose(message, { context: typeof context === 'string' ? context : undefined });
      } else {
        console.log(message, ...optionalParams);
      }
    } catch (e) {
      console.log(message, ...optionalParams);
    }
  }
}
