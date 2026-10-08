import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/api-response';

export class HealthController {
  public static async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Simple lightweight query to verify active PostgreSQL database connectivity
      await prisma.$queryRaw`SELECT 1`;

      sendSuccess(
        res,
        {
          status: 'UP',
          database: 'CONNECTED',
          timestamp: new Date().toISOString(),
        },
        'Smart Print API is healthy',
        200,
      );
    } catch (error) {
      next(error);
    }
  }
}
