import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WinstonLogger } from '../src/common/logger/winston-logger.service';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const logger = new WinstonLogger();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger }
    );

    // Dynamic CORS setup
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['*'];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // If ALLOWED_ORIGINS includes '*' or mirrors the specific origin
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
};
