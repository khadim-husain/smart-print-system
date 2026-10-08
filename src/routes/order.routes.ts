import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  paymentSimulationSchema,
  printExecutionSchema,
  printFailureSchema,
  orderIdParamSchema,
} from '../validators/order.validator';

const router = Router();

// Create Order: POST /api/v1/orders
router.post('/', validateRequest({ body: createOrderSchema }), OrderController.createOrder);

// Get Order Details: GET /api/v1/orders/:orderId
router.get('/:orderId', validateRequest({ params: orderIdParamSchema }), OrderController.getOrder);

// Generic Status Transition: PATCH /api/v1/orders/:orderId/status
router.patch(
  '/:orderId/status',
  validateRequest({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  OrderController.updateStatus,
);

// Payment Simulation: POST /api/v1/orders/:orderId/payment
router.post(
  '/:orderId/payment',
  validateRequest({ params: orderIdParamSchema, body: paymentSimulationSchema }),
  OrderController.processPayment,
);

// Start Printing: POST /api/v1/orders/:orderId/print
router.post(
  '/:orderId/print',
  validateRequest({ params: orderIdParamSchema, body: printExecutionSchema }),
  OrderController.startPrint,
);

// Complete Printing: POST /api/v1/orders/:orderId/print/complete
router.post(
  '/:orderId/print/complete',
  validateRequest({ params: orderIdParamSchema }),
  OrderController.completePrint,
);

// Fail Printing: POST /api/v1/orders/:orderId/print/fail
router.post(
  '/:orderId/print/fail',
  validateRequest({ params: orderIdParamSchema, body: printFailureSchema }),
  OrderController.failPrint,
);

// Cancel Order: POST /api/v1/orders/:orderId/cancel
router.post(
  '/:orderId/cancel',
  validateRequest({ params: orderIdParamSchema }),
  OrderController.cancelOrder,
);

// Get Audit Logs: GET /api/v1/orders/:orderId/audit-logs
router.get(
  '/:orderId/audit-logs',
  validateRequest({ params: orderIdParamSchema }),
  OrderController.getAuditLogs,
);

export default router;
