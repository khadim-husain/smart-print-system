import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import healthRoutes from './routes/health.routes';
import v1Routes from './routes/index';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';

export function createApp(): Application {
  const app: Application = express();

  // 1. Security & Headers
  app.use(helmet());
  app.use(cors());

  // 2. Request Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Request Logging (skip in test environment)
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // 4. Root Health Check
  app.use('/health', healthRoutes);

  // 5. Versioned API Routes
  app.use('/api/v1', v1Routes);

  // 6. Catch-All 404 Handler
  app.use(notFoundHandler);

  // 7. Centralized Error Boundary
  app.use(errorHandler);

  return app;
}

export const app = createApp();
