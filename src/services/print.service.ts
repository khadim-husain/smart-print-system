import { OrderStatus, PrintJobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { PrintExecutionDTO, PrintFailureDTO, OrderDetailsResponse } from '../types/order.types';
import { AuditService } from './audit.service';
import { OrderService } from './order.service';
import { assertValidTransition } from '../utils/state-machine';
import { NotFoundError } from '../errors/not-found.error';

export class PrintService {
  /**
   * Starts physical printing on kiosk hardware.
   * Allowed ONLY if order is in PAID status: PAID -> PRINTING.
   * Creates PRINT_STARTED audit log.
   */
  public static async startPrinting(
    orderId: string,
    dto: PrintExecutionDTO = {},
  ): Promise<OrderDetailsResponse> {
    const existingOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    // State machine guard: validates PAID -> PRINTING
    assertValidTransition(existingOrder.status, OrderStatus.PRINTING);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderId },
        data: { status: OrderStatus.PRINTING },
      });

      await tx.printJob.update({
        where: { orderId },
        data: {
          status: PrintJobStatus.PRINTING,
          startedAt: new Date(),
        },
      });

      await AuditService.logEvent(
        {
          orderId,
          kioskId: existingOrder.kioskId,
          userId: dto.userId ?? null,
          event: 'PRINT_STARTED',
          metadata: {
            trayNumber: dto.trayNumber || 'Default-Tray',
            copies: existingOrder.copies,
            paperSize: existingOrder.paperSize,
            colorMode: existingOrder.colorMode,
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
      throw new NotFoundError(`Order with ID '${orderId}' not found after printing start`);
    }

    return OrderService.mapToResponse(updatedOrder);
  }

  /**
   * Completes physical printing successfully: PRINTING -> COMPLETED.
   * Creates PRINT_COMPLETED audit log.
   */
  public static async completePrinting(
    orderId: string,
    userId?: string,
  ): Promise<OrderDetailsResponse> {
    const existingOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    // State machine guard: validates PRINTING -> COMPLETED
    assertValidTransition(existingOrder.status, OrderStatus.COMPLETED);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderId },
        data: { status: OrderStatus.COMPLETED },
      });

      await tx.printJob.update({
        where: { orderId },
        data: {
          status: PrintJobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await AuditService.logEvent(
        {
          orderId,
          kioskId: existingOrder.kioskId,
          userId: userId ?? null,
          event: 'PRINT_COMPLETED',
          metadata: {
            pagesPrinted: existingOrder.copies,
            completionTime: new Date().toISOString(),
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
      throw new NotFoundError(`Order with ID '${orderId}' not found after print completion`);
    }

    return OrderService.mapToResponse(updatedOrder);
  }

  /**
   * Reports physical hardware failure: PRINTING -> PRINT_FAILED.
   * Creates PRINT_FAILED audit log.
   */
  public static async failPrinting(
    orderId: string,
    dto: PrintFailureDTO = {},
  ): Promise<OrderDetailsResponse> {
    const existingOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { printJob: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`);
    }

    // State machine guard: validates PRINTING -> PRINT_FAILED
    assertValidTransition(existingOrder.status, OrderStatus.PRINT_FAILED);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderId },
        data: { status: OrderStatus.PRINT_FAILED },
      });

      await tx.printJob.update({
        where: { orderId },
        data: {
          status: PrintJobStatus.FAILED,
        },
      });

      await AuditService.logEvent(
        {
          orderId,
          kioskId: existingOrder.kioskId,
          userId: dto.userId ?? null,
          event: 'PRINT_FAILED',
          metadata: {
            reason: dto.reason || 'Hardware paper jam / spooler timeout',
            errorCode: dto.errorCode || 'ERR_PRINT_HARDWARE',
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
      throw new NotFoundError(`Order with ID '${orderId}' not found after print failure`);
    }

    return OrderService.mapToResponse(updatedOrder);
  }
}
