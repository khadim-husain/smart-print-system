import { Prisma, OrderStatus, PrintJobStatus, PaperSize, ColorMode } from '@prisma/client';
import { prisma } from '../config/database';
import { CreateOrderDTO, OrderDetailsResponse } from '../types/order.types';
import { PricingService } from './pricing.service';
import { AuditService } from './audit.service';
import { generateOrderId } from '../utils/order-id';
import { assertValidTransition } from '../utils/state-machine';
import { NotFoundError } from '../errors/not-found.error';

type OrderWithPrintJob = Prisma.OrderGetPayload<{ include: { printJob: true } }>;

export class OrderService {
  /**
   * Atomically creates an Order, its associated PrintJob, and the genesis ORDER_CREATED audit log.
   * If any step fails, the entire transaction is rolled back.
   */
  public static async createOrder(dto: CreateOrderDTO): Promise<OrderDetailsResponse> {
    // 1. Calculate price deterministically on backend (never trust client)
    const price = PricingService.calculatePrice(dto.paperSize, dto.colorMode, dto.copies);

    // 2. Generate collision-resistant unique human-readable order ID
    const orderId = generateOrderId();

    // 3. Perform atomic creation within a PostgreSQL transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderId,
          customerId: dto.customerId,
          kioskId: dto.kioskId,
          fileUrl: dto.fileUrl,
          copies: dto.copies,
          paperSize: dto.paperSize as PaperSize,
          colorMode: dto.colorMode as ColorMode,
          price: new Prisma.Decimal(price),
          status: OrderStatus.CREATED,
        },
      });

      // Create associated Print Job
      const newPrintJob = await tx.printJob.create({
        data: {
          orderId: newOrder.orderId,
          kioskId: newOrder.kioskId,
          status: PrintJobStatus.PENDING,
        },
      });

      // Append genesis audit log
      await AuditService.logEvent(
        {
          orderId: newOrder.orderId,
          kioskId: newOrder.kioskId,
          userId: newOrder.customerId,
          event: 'ORDER_CREATED',
          metadata: {
            copies: dto.copies,
            paperSize: dto.paperSize,
            colorMode: dto.colorMode,
            price,
            fileUrl: dto.fileUrl,
          },
        },
        tx,
      );

      return {
        ...newOrder,
        printJob: newPrintJob,
      };
    });

    return this.mapToResponse(createdOrder);
  }

  /**
   * Retrieves order details and associated print job by unique orderId.
   */
  public static async getOrderById(orderId: string): Promise<OrderDetailsResponse> {
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!order) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    return this.mapToResponse(order);
  }

  /**
   * Transitions an order to targetStatus after validating via state machine rules.
   */
  public static async updateOrderStatus(
    orderId: string,
    targetStatus: OrderStatus,
    userId?: string,
    note?: string,
  ): Promise<OrderDetailsResponse> {
    // 1. Fetch current order
    const existingOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    // 2. State Machine Guard Check
    assertValidTransition(existingOrder.status, targetStatus);

    // 3. Atomic transition and audit write
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Determine related print job status synchronization
      let printJobStatusUpdate: PrintJobStatus | undefined;
      if (targetStatus === OrderStatus.CANCELLED) {
        printJobStatusUpdate = PrintJobStatus.CANCELLED;
      } else if (targetStatus === OrderStatus.PRINTING) {
        printJobStatusUpdate = PrintJobStatus.PRINTING;
      } else if (targetStatus === OrderStatus.COMPLETED) {
        printJobStatusUpdate = PrintJobStatus.COMPLETED;
      } else if (targetStatus === OrderStatus.PRINT_FAILED) {
        printJobStatusUpdate = PrintJobStatus.FAILED;
      }

      await tx.order.update({
        where: { orderId },
        data: { status: targetStatus },
      });

      if (printJobStatusUpdate) {
        await tx.printJob.update({
          where: { orderId },
          data: {
            status: printJobStatusUpdate,
            ...(targetStatus === OrderStatus.PRINTING ? { startedAt: new Date() } : {}),
            ...(targetStatus === OrderStatus.COMPLETED ? { completedAt: new Date() } : {}),
          },
        });
      }

      await AuditService.logEvent(
        {
          orderId,
          kioskId: existingOrder.kioskId,
          userId: userId ?? null,
          event: 'STATUS_UPDATED',
          metadata: {
            fromStatus: existingOrder.status,
            toStatus: targetStatus,
            note: note || undefined,
          },
        },
        tx,
      );

      return tx.order.findUnique({
        where: { orderId },
        include: { printJob: true },
      });
    });

    if (!updatedOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found after update`);
    }

    return this.mapToResponse(updatedOrder);
  }

  /**
   * Cancels an active order (allowed from CREATED, PAYMENT_PENDING, or PAID).
   */
  public static async cancelOrder(orderId: string, userId?: string): Promise<OrderDetailsResponse> {
    const existingOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    // State machine check
    assertValidTransition(existingOrder.status, OrderStatus.CANCELLED);

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.printJob.update({
        where: { orderId },
        data: { status: PrintJobStatus.CANCELLED },
      });

      await AuditService.logEvent(
        {
          orderId,
          kioskId: existingOrder.kioskId,
          userId: userId ?? existingOrder.customerId,
          event: 'ORDER_CANCELLED',
          metadata: {
            previousStatus: existingOrder.status,
            reason: 'User / Operator initiated cancellation',
          },
        },
        tx,
      );

      return tx.order.findUnique({
        where: { orderId },
        include: { printJob: true },
      });
    });

    if (!cancelledOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found after cancellation`);
    }

    return this.mapToResponse(cancelledOrder);
  }

  public static mapToResponse(order: OrderWithPrintJob): OrderDetailsResponse {
    return {
      id: order.id,
      orderId: order.orderId,
      customerId: order.customerId,
      kioskId: order.kioskId,
      fileUrl: order.fileUrl,
      copies: order.copies,
      paperSize: order.paperSize,
      colorMode: order.colorMode,
      price: Number(order.price),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      printJob: order.printJob
        ? {
            id: order.printJob.id,
            orderId: order.printJob.orderId,
            kioskId: order.printJob.kioskId,
            status: order.printJob.status,
            startedAt: order.printJob.startedAt,
            completedAt: order.printJob.completedAt,
            createdAt: order.printJob.createdAt,
            updatedAt: order.printJob.updatedAt,
          }
        : null,
    };
  }
}
