import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { AuditLogResponse } from '../../src/types/order.types';

describe('Order & Lifecycle Integration Tests', () => {
  beforeEach(async () => {
    // Clean database before each test suite execution
    await prisma.auditLog.deleteMany();
    await prisma.printJob.deleteMany();
    await prisma.order.deleteMany();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.printJob.deleteMany();
    await prisma.order.deleteMany();
    await prisma.$disconnect();
  });

  describe('1. Order Creation (POST /api/v1/orders)', () => {
    it('should successfully create an order with calculated price, print job, and audit log', async () => {
      const payload = {
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 3,
        paperSize: 'A4',
        colorMode: 'BW',
      };

      const response = await request(app).post('/api/v1/orders').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order created successfully');

      const data = response.body.data;
      expect(data.orderId).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
      expect(data.customerId).toBe('CUS001');
      expect(data.kioskId).toBe('KIOSK001');
      expect(data.copies).toBe(3);
      expect(data.paperSize).toBe('A4');
      expect(data.colorMode).toBe('BW');
      // Price must be calculated on backend: 3 * 2.0 = 6.0
      expect(data.price).toBe(6.0);
      expect(data.status).toBe('CREATED');

      // Verify PrintJob creation
      expect(data.printJob).toBeDefined();
      expect(data.printJob.status).toBe('PENDING');
      expect(data.printJob.kioskId).toBe('KIOSK001');

      // Verify Audit Log in DB
      const logs = await prisma.auditLog.findMany({ where: { orderId: data.orderId } });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.event).toBe('ORDER_CREATED');
      expect(logs[0]?.kioskId).toBe('KIOSK001');
    });

    it('should ignore client-tampered price and calculate server-side price correctly', async () => {
      const payload = {
        customerId: 'CUS002',
        kioskId: 'KIOSK002',
        fileUrl: 'https://example.com/poster.pdf',
        copies: 4,
        paperSize: 'A3',
        colorMode: 'COLOR',
        price: 0, // Client tries to tamper with price
      };

      const response = await request(app).post('/api/v1/orders').send(payload);

      expect(response.status).toBe(201);
      // Backend price calculation: 4 * 20.0 = 80.0
      expect(response.body.data.price).toBe(80.0);
    });

    it('should reject missing or empty customerId with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: '',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should reject missing or empty kioskId with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: '   ',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid fileUrl with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'not-a-valid-url',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject zero copies with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 0,
        paperSize: 'A4',
        colorMode: 'BW',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject negative copies with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: -3,
        paperSize: 'A4',
        colorMode: 'BW',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unsupported paperSize with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'LETTER',
        colorMode: 'BW',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unsupported colorMode with 400', async () => {
      const response = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'SEPIA',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('2. Primary Lifecycle Flow (CREATED -> PAYMENT_PENDING -> PAID -> PRINTING -> COMPLETED)', () => {
    it('should execute full valid order progression seamlessly', async () => {
      // Step 1: Create Order (Status: CREATED)
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/document.pdf',
        copies: 2,
        paperSize: 'A4',
        colorMode: 'COLOR',
      });
      expect(createRes.status).toBe(201);
      const orderId = createRes.body.data.orderId;

      // Step 2: Transition to PAYMENT_PENDING
      const statusRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('PAYMENT_PENDING');

      // Step 3: Simulate Payment Success (PAYMENT_PENDING -> PAID)
      const paymentRes = await request(app)
        .post(`/api/v1/orders/${orderId}/payment`)
        .send({ success: true, transactionRef: 'TXN-SUCCESS-123' });
      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.data.status).toBe('PAID');

      // Step 4: Start Printing (PAID -> PRINTING)
      const printRes = await request(app)
        .post(`/api/v1/orders/${orderId}/print`)
        .send({ trayNumber: 'Tray-1' });
      expect(printRes.status).toBe(200);
      expect(printRes.body.data.status).toBe('PRINTING');
      expect(printRes.body.data.printJob.status).toBe('PRINTING');

      // Step 5: Complete Printing (PRINTING -> COMPLETED)
      const completeRes = await request(app)
        .post(`/api/v1/orders/${orderId}/print/complete`)
        .send({});
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('COMPLETED');
      expect(completeRes.body.data.printJob.status).toBe('COMPLETED');

      // Step 6: Verify Audit Trail
      const auditRes = await request(app).get(`/api/v1/orders/${orderId}/audit-logs`);
      expect(auditRes.status).toBe(200);
      const events = auditRes.body.data.map((l: AuditLogResponse) => l.event);
      expect(events).toEqual([
        'ORDER_CREATED',
        'STATUS_UPDATED',
        'PAYMENT_SUCCESS',
        'PRINT_STARTED',
        'PRINT_COMPLETED',
      ]);
    });
  });

  describe('3. Failure Lifecycles', () => {
    it('should handle payment failure flow: PAYMENT_PENDING -> PAYMENT_FAILED', async () => {
      // Create Order
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/invoice.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;

      // Move to PAYMENT_PENDING
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });

      // Simulate payment failure
      const failRes = await request(app)
        .post(`/api/v1/orders/${orderId}/payment`)
        .send({ success: false });
      expect(failRes.status).toBe(200);
      expect(failRes.body.data.status).toBe('PAYMENT_FAILED');

      // Verify audit log has PAYMENT_FAILED
      const auditRes = await request(app).get(`/api/v1/orders/${orderId}/audit-logs`);
      const events = auditRes.body.data.map((l: AuditLogResponse) => l.event);
      expect(events).toContain('PAYMENT_FAILED');
    });

    it('should handle print failure flow: PRINTING -> PRINT_FAILED', async () => {
      // Create Order
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/invoice.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;

      // Move to PAYMENT_PENDING -> PAID -> PRINTING
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });
      await request(app).post(`/api/v1/orders/${orderId}/print`).send({});

      // Fail printing
      const failRes = await request(app).post(`/api/v1/orders/${orderId}/print/fail`).send({
        reason: 'Paper jam in tray 1',
        errorCode: 'JAM_001',
      });

      expect(failRes.status).toBe(200);
      expect(failRes.body.data.status).toBe('PRINT_FAILED');
      expect(failRes.body.data.printJob.status).toBe('FAILED');

      // Verify audit log
      const auditRes = await request(app).get(`/api/v1/orders/${orderId}/audit-logs`);
      const events = auditRes.body.data.map((l: AuditLogResponse) => l.event);
      expect(events).toContain('PRINT_FAILED');
    });
  });

  describe('4. Cancellation Lifecycles', () => {
    it('should allow cancellation from CREATED', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;

      const cancelRes = await request(app).post(`/api/v1/orders/${orderId}/cancel`).send({});
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should allow cancellation from PAYMENT_PENDING', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });

      const cancelRes = await request(app).post(`/api/v1/orders/${orderId}/cancel`).send({});
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should allow cancellation from PAID', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });

      const cancelRes = await request(app).post(`/api/v1/orders/${orderId}/cancel`).send({});
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });
  });

  describe('5. Invalid Transition Rejections via API (HTTP 409)', () => {
    it('should reject PAID -> CREATED', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });

      const invalidRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'CREATED' });
      expect(invalidRes.status).toBe(409);
      expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(invalidRes.body.error.message).toContain(
        'Cannot transition order from PAID to CREATED',
      );
    });

    it('should reject PAID -> COMPLETED directly', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });

      const invalidRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'COMPLETED' });
      expect(invalidRes.status).toBe(409);
      expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject CREATED -> PAID directly', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;

      const invalidRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAID' });
      expect(invalidRes.status).toBe(409);
      expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject CREATED -> PRINTING directly', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;

      const printRes = await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      expect(printRes.status).toBe(409);
      expect(printRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject COMPLETED -> PRINTING', async () => {
      // Complete an order
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });
      await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      await request(app).post(`/api/v1/orders/${orderId}/print/complete`).send({});

      const retryPrint = await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      expect(retryPrint.status).toBe(409);
      expect(retryPrint.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject COMPLETED -> PAID', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });
      await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      await request(app).post(`/api/v1/orders/${orderId}/print/complete`).send({});

      const invalidRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAID' });
      expect(invalidRes.status).toBe(409);
    });

    it('should reject CANCELLED -> PRINTING', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app).post(`/api/v1/orders/${orderId}/cancel`).send({});

      const printRes = await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      expect(printRes.status).toBe(409);
    });

    it('should reject CANCELLED -> PAID', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app).post(`/api/v1/orders/${orderId}/cancel`).send({});

      const paymentRes = await request(app)
        .post(`/api/v1/orders/${orderId}/payment`)
        .send({ success: true });
      expect(paymentRes.status).toBe(409);
    });

    it('should reject PAYMENT_FAILED -> PAID', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: false });

      const retryPayment = await request(app)
        .post(`/api/v1/orders/${orderId}/payment`)
        .send({ success: true });
      expect(retryPayment.status).toBe(409);
    });

    it('should reject PRINT_FAILED -> PRINTING', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });
      await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      await request(app).post(`/api/v1/orders/${orderId}/print/fail`).send({});

      const retryPrint = await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      expect(retryPrint.status).toBe(409);
    });

    it('should reject cancellation of terminal order (e.g. COMPLETED)', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 1,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'PAYMENT_PENDING' });
      await request(app).post(`/api/v1/orders/${orderId}/payment`).send({ success: true });
      await request(app).post(`/api/v1/orders/${orderId}/print`).send({});
      await request(app).post(`/api/v1/orders/${orderId}/print/complete`).send({});

      const cancelRes = await request(app).post(`/api/v1/orders/${orderId}/cancel`).send({});
      expect(cancelRes.status).toBe(409);
    });
  });

  describe('6. Query Endpoints & Not Found Scenarios', () => {
    it('GET /api/v1/orders/:orderId should return order and print job details', async () => {
      const createRes = await request(app).post('/api/v1/orders').send({
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/file.pdf',
        copies: 2,
        paperSize: 'A4',
        colorMode: 'BW',
      });
      const orderId = createRes.body.data.orderId;

      const getRes = await request(app).get(`/api/v1/orders/${orderId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.orderId).toBe(orderId);
      expect(getRes.body.data.printJob).toBeDefined();
    });

    it('GET /api/v1/orders/:orderId should return 404 for non-existent order', async () => {
      const response = await request(app).get('/api/v1/orders/ORD-99999999-NONEXIST');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/v1/orders/:orderId/audit-logs should return 404 for non-existent order', async () => {
      const response = await request(app).get('/api/v1/orders/ORD-99999999-NONEXIST/audit-logs');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
