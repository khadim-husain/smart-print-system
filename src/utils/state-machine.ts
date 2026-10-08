import { OrderStatus } from '../types/order.types';
import { InvalidStateTransitionError } from '../errors/invalid-transition.error';

/**
 * State Transition Matrix for Order Lifecycle.
 * Represents the single source of truth for the finite state machine.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['PRINTING', 'CANCELLED'],
  PRINTING: ['COMPLETED', 'PRINT_FAILED'],
  COMPLETED: [],
  PAYMENT_FAILED: [],
  PRINT_FAILED: [],
  CANCELLED: [],
} as const;

export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  'COMPLETED',
  'PAYMENT_FAILED',
  'PRINT_FAILED',
  'CANCELLED',
] as const;

/**
 * Returns true if the transition from fromStatus to toStatus is permitted.
 */
export function canTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(toStatus);
}

/**
 * Asserts that a status transition is permitted.
 * Throws InvalidStateTransitionError if not allowed.
 */
export function assertValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): void {
  if (!canTransition(fromStatus, toStatus)) {
    throw new InvalidStateTransitionError(fromStatus, toStatus);
  }
}

/**
 * Checks whether an order is in an immutable terminal state.
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Gets all allowed target statuses from the current status.
 */
export function getAllowedNextStatuses(currentStatus: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}
