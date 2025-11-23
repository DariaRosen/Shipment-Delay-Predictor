import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import type { Request, Response } from 'express';
import * as express from 'express';
import * as dotenv from 'dotenv';

let cachedApp: express.Express;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  // Load environment variables
  dotenv.config();

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    cors: false,
  });

  // Configure CORS to allow Vercel frontend URLs and localhost
  const allowedOrigins = [
    'http://localhost:3000',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : null,
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  cachedApp = server;
  return server;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const app = await createApp();
  app(req, res);
}

