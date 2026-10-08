import { AppError } from './app.error';

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly errorCode = 'NOT_FOUND';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
