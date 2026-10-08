import { AppError } from './app.error';

export class BadRequestError extends AppError {
  public readonly statusCode = 400;
  public readonly errorCode = 'BAD_REQUEST';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
