import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import type { Request, Response } from 'express';
import * as dotenv from 'dotenv';

// Use require for express to ensure compatibility in Vercel serverless environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

let cachedApp: ReturnType<typeof express>;

async function createApp(): Promise<any> {
  if (cachedApp) {
    return cachedApp;
  }

  // Load environment variables (Vercel provides these automatically, but dotenv helps for local dev)
  dotenv.config();

  // Log environment check (without exposing secrets)
  console.log('Environment check:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  console.log('- NODE_ENV:', process.env.NODE_ENV);

  try {
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
    console.log('NestJS app initialized successfully');
    return server;
  } catch (error) {
    console.error('Failed to create NestJS app:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const app = await createApp();
    
    // Handle the request
    return new Promise((resolve, reject) => {
      app(req, res, (err?: any) => {
        if (err) {
          console.error('Request handling error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Serverless function error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Send error response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      });
    }
  }
}

