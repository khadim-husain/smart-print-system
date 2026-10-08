-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAID', 'PRINTING', 'COMPLETED', 'PAYMENT_FAILED', 'PRINT_FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('A4', 'A3');

-- CreateEnum
CREATE TYPE "ColorMode" AS ENUM ('BW', 'COLOR');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('ORDER_CREATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PRINT_STARTED', 'PRINT_COMPLETED', 'PRINT_FAILED', 'ORDER_CANCELLED', 'STATUS_UPDATED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(32) NOT NULL,
    "customer_id" VARCHAR(64) NOT NULL,
    "kiosk_id" VARCHAR(64) NOT NULL,
    "file_url" TEXT NOT NULL,
    "copies" INTEGER NOT NULL,
    "paper_size" "PaperSize" NOT NULL,
    "color_mode" "ColorMode" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(32) NOT NULL,
    "kiosk_id" VARCHAR(64) NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(32) NOT NULL,
    "kiosk_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64),
    "event" "AuditEventType" NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id");

-- CreateIndex
CREATE INDEX "idx_orders_customer_id" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "idx_orders_kiosk_id" ON "orders"("kiosk_id");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_order_id_key" ON "print_jobs"("order_id");

-- CreateIndex
CREATE INDEX "idx_print_jobs_kiosk_id" ON "print_jobs"("kiosk_id");

-- CreateIndex
CREATE INDEX "idx_print_jobs_status" ON "print_jobs"("status");

-- CreateIndex
CREATE INDEX "idx_audit_logs_order_id_timestamp" ON "audit_logs"("order_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_logs_event" ON "audit_logs"("event");

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;
