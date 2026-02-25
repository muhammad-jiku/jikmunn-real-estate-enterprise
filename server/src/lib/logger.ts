import winston from 'winston';
import { config } from '../config/index.config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

// Add file transports only in development (not on Vercel/serverless)
if (config.env !== 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
