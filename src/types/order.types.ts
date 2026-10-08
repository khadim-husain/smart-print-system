export type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PRINTING'
  | 'COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PRINT_FAILED'
  | 'CANCELLED';

export type PrintJobStatus = 'PENDING' | 'PRINTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type PaperSize = 'A4' | 'A3';

export type ColorMode = 'BW' | 'COLOR';

export type AuditEventType =
  | 'ORDER_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PRINT_STARTED'
  | 'PRINT_COMPLETED'
  | 'PRINT_FAILED'
  | 'ORDER_CANCELLED'
  | 'STATUS_UPDATED';

export interface CreateOrderDTO {
  customerId: string;
  kioskId: string;
  fileUrl: string;
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
  userId?: string;
  note?: string;
}

export interface PaymentSimulationDTO {
  success: boolean;
  userId?: string;
  transactionRef?: string;
}

export interface PrintExecutionDTO {
  userId?: string;
  trayNumber?: string;
}

export interface PrintFailureDTO {
  reason?: string;
  errorCode?: string;
  userId?: string;
}

export interface OrderDetailsResponse {
  id: string;
  orderId: string;
  customerId: string;
  kioskId: string;
  fileUrl: string;
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
  price: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  printJob: {
    id: string;
    orderId: string;
    kioskId: string;
    status: PrintJobStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export interface AuditLogResponse {
  id: string;
  orderId: string;
  kioskId: string;
  userId: string | null;
  event: AuditEventType;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}
