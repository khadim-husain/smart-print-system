import { OrderStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { PaymentSimulationDTO, OrderDetailsResponse } from '../types/order.types';
import { AuditService } from './audit.service';
import { OrderService } from './order.service';
import { assertValidTransition } from '../utils/state-machine';
import { NotFoundError } from '../errors/not-found.error';

export class PaymentService {
  /**
   * Simulates payment gateway response for an order in PAYMENT_PENDING status.
   * If success = true:  PAYMENT_PENDING -> PAID (audit: PAYMENT_SUCCESS)
   * If success = false: PAYMENT_PENDING -> PAYMENT_FAILED (audit: PAYMENT_FAILED)
   */
  public static async processPayment(
    orderId: string,
    dto: PaymentSimulationDTO,
  ): Promise<OrderDetailsResponse> {
    const existingOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    const targetStatus = dto.success ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;
    const auditEvent = dto.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';

    // State machine guard check: validates if current status can transition to targetStatus
    assertValidTransition(existingOrder.status, targetStatus);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { orderId },
        data: { status: targetStatus },
        include: { printJob: true },
      });

      await AuditService.logEvent(
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          userId: dto.userId ?? order.customerId,
          event: auditEvent,
          metadata: {
            success: dto.success,
            amount: Number(order.price),
            transactionRef: dto.transactionRef || `SIM-PAY-${Date.now()}`,
          },
        },
        tx,
      );

      return order;
    });

    return OrderService.mapToResponse(updatedOrder);
  }
}
