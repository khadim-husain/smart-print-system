import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/database';
import { AuditEventType, AuditLogResponse } from '../types/order.types';

export interface CreateAuditLogParams {
  orderId: string;
  kioskId: string;
  userId?: string | null;
  event: AuditEventType;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Appends an immutable audit event to PostgreSQL.
   * Accepts either an ongoing Prisma transaction or falls back to standard client.
   */
  public static async logEvent(
    params: CreateAuditLogParams,
    tx: Prisma.TransactionClient | PrismaClient = defaultPrisma,
  ): Promise<void> {
    const { orderId, kioskId, userId, event, metadata } = params;

    await tx.auditLog.create({
      data: {
        orderId,
        kioskId,
        userId: userId ?? null,
        event,
        metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Fetches all audit log entries for a given orderId in strictly ascending chronological order.
   */
  public static async getLogsByOrderId(orderId: string): Promise<AuditLogResponse[]> {
    const records = await defaultPrisma.auditLog.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
    });

    return records.map((log) => ({
      id: log.id,
      orderId: log.orderId,
      kioskId: log.kioskId,
      userId: log.userId,
      event: log.event as AuditEventType,
      metadata: (log.metadata as Record<string, unknown>) || null,
      timestamp: log.timestamp,
    }));
  }
}
