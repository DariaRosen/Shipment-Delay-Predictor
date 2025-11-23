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
  // For production, allow all Vercel domains; for development, be more restrictive
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const corsOptions = isDevelopment
    ? {
        origin: [
          'http://localhost:3000',
          process.env.FRONTEND_URL,
        ].filter(Boolean),
        credentials: true,
      }
    : {
        // In production, allow all Vercel domains
        origin: true, // Allow all origins in production (Vercel handles security)
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      };

  app.enableCors(corsOptions);
  
  // Log CORS configuration for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('CORS configured for origins:', corsOptions.origin);
  }

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

