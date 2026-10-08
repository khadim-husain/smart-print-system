import { AppError } from './app.error';
import { OrderStatus } from '../types/order.types';

export class InvalidStateTransitionError extends AppError {
  public readonly statusCode = 409;
  public readonly errorCode = 'INVALID_STATUS_TRANSITION';

  constructor(fromStatus: OrderStatus, toStatus: OrderStatus, message?: string) {
    const errorMsg = message || `Cannot transition order from ${fromStatus} to ${toStatus}`;
    super(errorMsg, { fromStatus, toStatus });
  }
}
