import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { PaymentService } from '../services/payment.service';
import { PrintService } from '../services/print.service';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/api-response';
import { OrderStatus } from '../types/order.types';

export class OrderController {
  /**
   * POST /api/v1/orders
   * Atomically creates a new print order, print job, and ORDER_CREATED audit log.
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.createOrder(req.body);
      sendSuccess(res, order, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/:orderId
   * Fetches order details along with associated print job.
   */
  public static async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await OrderService.getOrderById(orderId as string);
      sendSuccess(res, order, 'Order retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/orders/:orderId/status
   * Manually transitions order status through finite state machine verification.
   */
  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status, userId, note } = req.body;
      const updatedOrder = await OrderService.updateOrderStatus(
        orderId as string,
        status as OrderStatus,
        userId,
        note,
      );
      sendSuccess(res, updatedOrder, `Order status transitioned to ${status} successfully`, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:orderId/payment
   * Simulates payment gateway success or failure.
   */
  public static async processPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { orderId } = req.params;
      const updatedOrder = await PaymentService.processPayment(orderId as string, req.body);
      const message = req.body.success
        ? 'Payment processed successfully'
        : 'Payment marked as failed';
      sendSuccess(res, updatedOrder, message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:orderId/print
   * Initiates printing hardware for a PAID order.
   */
  public static async startPrint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const updatedOrder = await PrintService.startPrinting(orderId as string, req.body);
      sendSuccess(res, updatedOrder, 'Print job started successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:orderId/print/complete
   * Marks a PRINTING order as COMPLETED.
   */
  public static async completePrint(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { orderId } = req.params;
      const { userId } = req.body;
      const updatedOrder = await PrintService.completePrinting(orderId as string, userId);
      sendSuccess(res, updatedOrder, 'Print job completed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:orderId/print/fail
   * Marks a PRINTING order as PRINT_FAILED.
   */
  public static async failPrint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const updatedOrder = await PrintService.failPrinting(orderId as string, req.body);
      sendSuccess(res, updatedOrder, 'Print job marked as failed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:orderId/cancel
   * Cancels an order from CREATED, PAYMENT_PENDING, or PAID.
   */
  public static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const { userId } = req.body;
      const cancelledOrder = await OrderService.cancelOrder(orderId as string, userId);
      sendSuccess(res, cancelledOrder, 'Order cancelled successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/:orderId/audit-logs
   * Fetches full chronological audit history for an order.
   */
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      // Also ensure order exists
      await OrderService.getOrderById(orderId as string);

      const logs = await AuditService.getLogsByOrderId(orderId as string);
      sendSuccess(res, logs, 'Audit logs retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
