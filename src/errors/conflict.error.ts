import { AppError } from './app.error';

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly errorCode = 'CONFLICT';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
