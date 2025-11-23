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
    
    // Suppress Express 4.x app.router deprecation errors
    // NestJS ExpressAdapter accesses app.router which is deprecated in Express 4.x
    // The error is thrown synchronously, so we need to catch it properly
    
    let app;
    let initializationError: any = null;
    
    // Wrap the initialization in a way that catches the deprecation error
    try {
      app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        cors: false,
      });
    } catch (nestError: any) {
      initializationError = nestError;
      const errorMessage = nestError?.message || String(nestError);
      
      // Check if it's the router deprecation error
      if (errorMessage.includes("'app.router' is deprecated")) {
        console.warn('Caught router deprecation error, but this is non-fatal. Continuing...');
        // The error is thrown, but we can still try to use the server
        // The ExpressAdapter might have partially initialized
        // Let's try to create the app again, or use the server directly
        try {
          // Try without the adapter first
          app = await NestFactory.create(AppModule, {
            cors: false,
          });
          // Manually attach Express server
          const adapter = new ExpressAdapter(server);
          (app as any).httpAdapter = adapter;
        } catch (retryError) {
          // If that fails, the deprecation error might have prevented initialization
          // But the server itself should still work - let's see if we can proceed
          console.error('Retry failed, but server might still be usable:', retryError);
          // Don't throw - let's see if the server works anyway
          throw nestError;
        }
      } else {
        // Not a router error, throw it
        throw nestError;
      }
    }
    
    // If we got here but app is undefined, something went wrong
    if (!app) {
      throw initializationError || new Error('Failed to initialize NestJS app');
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
    });
    
    // If it's the deprecation error, log it but don't fail completely
    if (errorMessage.includes("'app.router' is deprecated")) {
      console.warn('Express deprecation warning caught, but app should still work');
      // If we somehow got here with a cached app, return it
      if (cachedApp) {
        return cachedApp;
      }
    }
    
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

