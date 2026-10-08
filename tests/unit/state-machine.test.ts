import {
  canTransition,
  assertValidTransition,
  isTerminalStatus,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
} from '../../src/utils/state-machine';
import { InvalidStateTransitionError } from '../../src/errors/invalid-transition.error';
import { OrderStatus } from '../../src/types/order.types';

describe('Order State Machine Unit Tests', () => {
  describe('Valid Primary & Failure Transitions', () => {
    const validCases: Array<[OrderStatus, OrderStatus]> = [
      ['CREATED', 'PAYMENT_PENDING'],
      ['PAYMENT_PENDING', 'PAID'],
      ['PAID', 'PRINTING'],
      ['PRINTING', 'COMPLETED'],
      ['PAYMENT_PENDING', 'PAYMENT_FAILED'],
      ['PRINTING', 'PRINT_FAILED'],
      ['CREATED', 'CANCELLED'],
      ['PAYMENT_PENDING', 'CANCELLED'],
      ['PAID', 'CANCELLED'],
    ];

    it.each(validCases)('should permit valid transition from %s to %s', (fromStatus, toStatus) => {
      expect(canTransition(fromStatus, toStatus)).toBe(true);
      expect(() => assertValidTransition(fromStatus, toStatus)).not.toThrow();
    });
  });

  describe('Invalid & Disallowed Transitions', () => {
    const invalidCases: Array<[OrderStatus, OrderStatus]> = [
      ['PAID', 'CREATED'],
      ['PAID', 'COMPLETED'],
      ['CREATED', 'PAID'],
      ['CREATED', 'PRINTING'],
      ['COMPLETED', 'PRINTING'],
      ['COMPLETED', 'PAID'],
      ['COMPLETED', 'CREATED'],
      ['CANCELLED', 'PRINTING'],
      ['CANCELLED', 'PAID'],
      ['CANCELLED', 'CREATED'],
      ['PAYMENT_FAILED', 'PAID'],
      ['PAYMENT_FAILED', 'PRINTING'],
      ['PRINT_FAILED', 'PRINTING'],
      ['PRINT_FAILED', 'COMPLETED'],
      ['PRINTING', 'PAID'],
    ];

    it.each(invalidCases)(
      'should strictly reject invalid transition from %s to %s',
      (fromStatus, toStatus) => {
        expect(canTransition(fromStatus, toStatus)).toBe(false);
        expect(() => assertValidTransition(fromStatus, toStatus)).toThrow(
          InvalidStateTransitionError,
        );
      },
    );
  });

  describe('Terminal Status Rules', () => {
    it('should identify all terminal states accurately', () => {
      expect(isTerminalStatus('COMPLETED')).toBe(true);
      expect(isTerminalStatus('PAYMENT_FAILED')).toBe(true);
      expect(isTerminalStatus('PRINT_FAILED')).toBe(true);
      expect(isTerminalStatus('CANCELLED')).toBe(true);

      expect(isTerminalStatus('CREATED')).toBe(false);
      expect(isTerminalStatus('PAYMENT_PENDING')).toBe(false);
      expect(isTerminalStatus('PAID')).toBe(false);
      expect(isTerminalStatus('PRINTING')).toBe(false);
    });

    it('should have zero permitted transitions out of any terminal status', () => {
      const allStatuses: OrderStatus[] = [
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'PRINTING',
        'COMPLETED',
        'PAYMENT_FAILED',
        'PRINT_FAILED',
        'CANCELLED',
      ];

      for (const terminal of TERMINAL_STATUSES) {
        expect(ALLOWED_TRANSITIONS[terminal]).toEqual([]);
        for (const target of allStatuses) {
          expect(canTransition(terminal, target)).toBe(false);
        }
      }
    });
  });
});
