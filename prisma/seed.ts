import { PrismaClient, OrderStatus, PrintJobStatus, PaperSize, ColorMode, AuditEventType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Starting database seed for Smart Print Order & Job Management System...');

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.printJob.deleteMany();
  await prisma.order.deleteMany();

  console.info('🧹 Cleaned existing database records.');

  // Sample seed orders across representative kiosk IDs and customer IDs
  // 1. Order 1: Completed Lifecycle
  const order1Id = 'ORD-20261008-000001';
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderId: order1Id,
        customerId: 'CUS001',
        kioskId: 'KIOSK001',
        fileUrl: 'https://example.com/docs/annual-report.pdf',
        copies: 3,
        paperSize: PaperSize.A4,
        colorMode: ColorMode.BW,
        price: 6.0, // 3 copies * 2.00
        status: OrderStatus.COMPLETED,
      },
    });

    await tx.printJob.create({
      data: {
        orderId: order.orderId,
        kioskId: order.kioskId,
        status: PrintJobStatus.COMPLETED,
        startedAt: new Date(Date.now() - 1000 * 60 * 15),
        completedAt: new Date(Date.now() - 1000 * 60 * 10),
      },
    });

    await tx.auditLog.createMany({
      data: [
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          userId: 'CUS001',
          event: AuditEventType.ORDER_CREATED,
          metadata: { copies: 3, paperSize: 'A4', colorMode: 'BW', price: 6.0 },
          timestamp: new Date(Date.now() - 1000 * 60 * 20),
        },
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          userId: 'CUS001',
          event: AuditEventType.PAYMENT_SUCCESS,
          metadata: { amount: 6.0, gatewayReference: 'SIM-PAY-9871' },
          timestamp: new Date(Date.now() - 1000 * 60 * 18),
        },
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          event: AuditEventType.PRINT_STARTED,
          metadata: { tray: 'Tray-1', paperSize: 'A4' },
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
        },
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          event: AuditEventType.PRINT_COMPLETED,
          metadata: { pagesPrinted: 3, status: 'SUCCESS' },
          timestamp: new Date(Date.now() - 1000 * 60 * 10),
        },
      ],
    });
  });

  // 2. Order 2: Currently Printing
  const order2Id = 'ORD-20261008-000002';
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderId: order2Id,
        customerId: 'CUS002',
        kioskId: 'KIOSK002',
        fileUrl: 'https://example.com/blueprints/site-plan.pdf',
        copies: 2,
        paperSize: PaperSize.A3,
        colorMode: ColorMode.COLOR,
        price: 40.0, // 2 copies * 20.00
        status: OrderStatus.PRINTING,
      },
    });

    await tx.printJob.create({
      data: {
        orderId: order.orderId,
        kioskId: order.kioskId,
        status: PrintJobStatus.PRINTING,
        startedAt: new Date(Date.now() - 1000 * 60 * 2),
      },
    });

    await tx.auditLog.createMany({
      data: [
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          userId: 'CUS002',
          event: AuditEventType.ORDER_CREATED,
          metadata: { copies: 2, paperSize: 'A3', colorMode: 'COLOR', price: 40.0 },
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
        },
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          userId: 'CUS002',
          event: AuditEventType.PAYMENT_SUCCESS,
          metadata: { amount: 40.0, gatewayReference: 'SIM-PAY-9872' },
          timestamp: new Date(Date.now() - 1000 * 60 * 4),
        },
        {
          orderId: order.orderId,
          kioskId: order.kioskId,
          event: AuditEventType.PRINT_STARTED,
          metadata: { tray: 'Tray-2', paperSize: 'A3' },
          timestamp: new Date(Date.now() - 1000 * 60 * 2),
        },
      ],
    });
  });

  // 3. Order 3: Created and awaiting payment
  const order3Id = 'ORD-20261008-000003';
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderId: order3Id,
        customerId: 'CUS001',
        kioskId: 'KIOSK003',
        fileUrl: 'https://example.com/tickets/boarding-pass.pdf',
        copies: 1,
        paperSize: PaperSize.A4,
        colorMode: ColorMode.COLOR,
        price: 10.0, // 1 copy * 10.00
        status: OrderStatus.CREATED,
      },
    });

    await tx.printJob.create({
      data: {
        orderId: order.orderId,
        kioskId: order.kioskId,
        status: PrintJobStatus.PENDING,
      },
    });

    await tx.auditLog.create({
      data: {
        orderId: order.orderId,
        kioskId: order.kioskId,
        userId: 'CUS001',
        event: AuditEventType.ORDER_CREATED,
        metadata: { copies: 1, paperSize: 'A4', colorMode: 'COLOR', price: 10.0 },
      },
    });
  });

  console.info('✅ Database seeded successfully with sample orders across kiosks KIOSK001, KIOSK002, KIOSK003 and customers CUS001, CUS002.');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
