# Smart Print Order & Job Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Jest-29.7-red.svg)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

A production-grade backend service orchestrating printing orders and hardware print jobs across a distributed network of self-service edge kiosks. Built with TypeScript, Express, PostgreSQL, Prisma ORM, and an immutable finite state machine with strict transactional guarantees.

---

## 1. Project Overview & Problem Statement

Distributed printing kiosks handle physical resources (paper, ink, mechanical spoolers) and financial transactions. Standard CRUD patterns fail in this environment due to race conditions, out-of-order hardware signals, client-side pricing tampering, and partial write failures.

The **Smart Print Order & Job Management System** provides:
- **Server-Side Pricing Authority:** Clients never dictate price. Costs are calculated deterministically on the backend.
- **ACID Transaction Boundary:** Order creation, hardware print job provisioning, and initial audit trail commit atomically.
- **Finite State Machine (FSM):** Guaranteed state transitions preventing invalid actions (e.g., printing before payment, mutating completed orders).
- **Persistent Audit Logging:** Every lifecycle milestone is recorded in PostgreSQL with full JSONB metadata.
- **Collision-Resistant Order IDs:** Human-readable IDs in `ORD-YYYYMMDD-XXXXXX` format backed by PostgreSQL uniqueness constraints.

---

## 2. Tech Stack

- **Runtime & Language:** Node.js (v18+) with TypeScript 5.6 (strict mode enabled).
- **Web Framework:** Express.js 4.21.
- **Database & ORM:** PostgreSQL 16 with Prisma ORM 5.22.
- **Validation:** Zod 3.23 for schema declaration and runtime request validation.
- **Security & Utilities:** Helmet (security headers), CORS, Morgan (HTTP logging), dotenv.
- **Automated Testing:** Jest 29 + Supertest 7 for unit and integration testing.
- **Code Quality:** ESLint 9 (flat config) + Prettier 3.

---

## 3. Architecture & Design Principles

The codebase adheres to **Layered Architecture** with strict Separation of Concerns:

```
                  ┌──────────────────────────────────────────┐
                  │          HTTP Request (Kiosk/Client)     │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │    Security & Middleware Pipeline        │
                  │    (Helmet, CORS, JSON Parser, Morgan)   │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │       Zod Request Validation Layer       │
                  │   (Validates Params, Query, Body Schema) │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │            Route Handlers                │
                  │    (Maps URIs to Controller Actions)     │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │           Order Controller               │
                  │ (HTTP protocol mapping, Status formatting│
                  └────────────────────┬─────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│     Pricing Service   │  │ State Machine Engine  │  │   Order ID Generator  │
│ (Lookup matrix & math)│  │ (FSM validation guard)│  │ (Unique format ORD-*) │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │              Order Service               │
                  │   (Coordinates Transactional Workflow)   │
                  └────────────────────┬─────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     Prisma ORM Client         │             │         Audit Service         │
│ (PostgreSQL ACID Transaction) │             │  (Appends Structured Events)  │
└───────────────────────────────┘             └───────────────────────────────┘
```

---

## 4. Complete Folder Structure

```
smart-print-system/
├── .env.example                               # Environment template for deployments
├── .gitignore                                 # Git ignore definitions
├── eslint.config.js                           # ESLint configuration
├── jest.config.js                             # Jest automated testing configuration
├── package.json                               # Dependencies & npm scripts
├── prettier.config.js                         # Prettier formatting rules
├── README.md                                  # Production documentation
├── Smart-Print-System.postman_collection.json # Importable Postman collection
├── tsconfig.json                              # TypeScript strict compiler options
├── prisma/
│   ├── migrations/
│   │   └── 20261008000000_init/
│   │       └── migration.sql                  # Initial database migration script
│   ├── schema.prisma                          # Prisma schema with models & enums
│   └── seed.ts                                # Database seed script
├── src/
│   ├── app.ts                                 # Express application setup
│   ├── server.ts                              # HTTP server bootstrap & graceful shutdown
│   ├── config/
│   │   ├── database.ts                        # PrismaClient singleton
│   │   └── env.ts                             # Zod-validated environment config
│   ├── constants/
│   │   └── pricing.constants.ts               # Unit price cards & supported formats
│   ├── controllers/
│   │   ├── health.controller.ts               # Health & DB connectivity check
│   │   └── order.controller.ts                # REST controller for order workflows
│   ├── errors/
│   │   ├── app.error.ts                       # Base application error class
│   │   ├── bad-request.error.ts               # 400 Bad Request error
│   │   ├── conflict.error.ts                  # 409 Conflict error
│   │   ├── invalid-transition.error.ts        # 409 Invalid state transition error
│   │   └── not-found.error.ts                 # 404 Not Found error
│   ├── middleware/
│   │   ├── error.middleware.ts                # Centralized error handler
│   │   ├── not-found.middleware.ts            # Catch-all 404 handler
│   │   └── validate.middleware.ts             # Generic Zod validation middleware
│   ├── routes/
│   │   ├── health.routes.ts                   # /health route
│   │   ├── index.ts                           # API v1 aggregator
│   │   └── order.routes.ts                    # /api/v1/orders routes
│   ├── services/
│   │   ├── audit.service.ts                   # PostgreSQL audit logging service
│   │   ├── order.service.ts                   # Order transactional orchestration
│   │   ├── payment.service.ts                 # Simulated payment processing
│   │   ├── pricing.service.ts                 # Isolated pricing engine
│   │   └── print.service.ts                   # Print hardware job state manager
│   ├── types/
│   │   ├── api.types.ts                       # Standard API response envelopes
│   │   └── order.types.ts                     # DTOs and domain types
│   ├── utils/
│   │   ├── api-response.ts                    # Response helper functions
│   │   ├── order-id.ts                        # Collision-resistant ID generator
│   │   └── state-machine.ts                   # Single source of truth FSM engine
│   └── validators/
│       └── order.validator.ts                 # Zod validation schemas
└── tests/
    ├── integration/
    │   ├── health.test.ts                     # Health endpoint integration tests
    │   └── order.test.ts                      # Full API & lifecycle integration tests
    └── unit/
        ├── order-id.test.ts                   # Order ID generation unit tests
        ├── pricing.test.ts                    # Pricing engine unit tests
        └── state-machine.test.ts              # State machine matrix unit tests
```

---

## 5. Database Design & Relations

The schema models three core entities linked by foreign keys with cascading actions:

```
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│             orders              │                 │           print_jobs            │
├─────────────────────────────────┤                 ├─────────────────────────────────┤
│ id           UUID [PK]          │ 1             1 │ id           UUID [PK]          │
│ orderId      VARCHAR(32) [UQ]   │─────────────────│ orderId      VARCHAR(32) [FK,UQ]│
│ customerId   VARCHAR(64) [IDX]  │                 │ kioskId      VARCHAR(64) [IDX]  │
│ kioskId      VARCHAR(64) [IDX]  │                 │ status       PrintJobStatus     │
│ fileUrl      TEXT               │                 │ startedAt    TIMESTAMPTZ NULL   │
│ copies       INTEGER            │                 │ completedAt  TIMESTAMPTZ NULL   │
│ paperSize    PaperSize          │                 │ createdAt    TIMESTAMPTZ        │
│ colorMode    ColorMode          │                 │ updatedAt    TIMESTAMPTZ        │
│ price        DECIMAL(10,2)      │                 └─────────────────────────────────┘
│ status       OrderStatus [IDX]  │
│ createdAt    TIMESTAMPTZ [IDX]  │ 1
│ updatedAt    TIMESTAMPTZ        │ │
└─────────────────────────────────┘ │
                                    │
                                    │               ┌─────────────────────────────────┐
                                    │ N             │           audit_logs            │
                                    └───────────────┤─────────────────────────────────┤
                                                    │ id           UUID [PK]          │
                                                    │ orderId      VARCHAR(32) [FK,IDX│
                                                    │ kioskId      VARCHAR(64) [IDX]  │
                                                    │ userId       VARCHAR(64) NULL   │
                                                    │ event        AuditEventType     │
                                                    │ metadata     JSONB NULL         │
                                                    │ timestamp    TIMESTAMPTZ [IDX]  │
                                                    └─────────────────────────────────┘
```

### Enums
- **OrderStatus:** `CREATED`, `PAYMENT_PENDING`, `PAID`, `PRINTING`, `COMPLETED`, `PAYMENT_FAILED`, `PRINT_FAILED`, `CANCELLED`
- **PrintJobStatus:** `PENDING`, `PRINTING`, `COMPLETED`, `FAILED`, `CANCELLED`
- **PaperSize:** `A4`, `A3`
- **ColorMode:** `BW`, `COLOR`
- **AuditEventType:** `ORDER_CREATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PRINT_STARTED`, `PRINT_COMPLETED`, `PRINT_FAILED`, `ORDER_CANCELLED`, `STATUS_UPDATED`

---

## 6. Order State Machine

### 6.1 State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> CREATED: Order Created (Atomically with PrintJob)
    
    CREATED --> PAYMENT_PENDING: Initiate Payment
    CREATED --> CANCELLED: Cancel Order
    
    PAYMENT_PENDING --> PAID: Payment Succeeded
    PAYMENT_PENDING --> PAYMENT_FAILED: Payment Failed
    PAYMENT_PENDING --> CANCELLED: Cancel Order
    
    PAID --> PRINTING: Start Printing
    PAID --> CANCELLED: Cancel Order (Refund)
    
    PRINTING --> COMPLETED: Print Successful
    PRINTING --> PRINT_FAILED: Hardware Error / Paper Jam
    
    COMPLETED --> [*]
    PAYMENT_FAILED --> [*]
    PRINT_FAILED --> [*]
    CANCELLED --> [*]
```

### 6.2 Transition Rules Matrix

| From Status (`Current`) | Permitted Next Statuses (`Target`) | Terminal State? |
| :--- | :--- | :---: |
| `CREATED` | `PAYMENT_PENDING`, `CANCELLED` | No |
| `PAYMENT_PENDING` | `PAID`, `PAYMENT_FAILED`, `CANCELLED` | No |
| `PAID` | `PRINTING`, `CANCELLED` | No |
| `PRINTING` | `COMPLETED`, `PRINT_FAILED` | No |
| `COMPLETED` | *(None - Empty Set)* | **Yes** |
| `PAYMENT_FAILED` | *(None - Empty Set)* | **Yes** |
| `PRINT_FAILED` | *(None - Empty Set)* | **Yes** |
| `CANCELLED` | *(None - Empty Set)* | **Yes** |

Any transition not explicitly listed in this table is rejected with HTTP `409 Conflict` and error code `INVALID_STATUS_TRANSITION`.

---

## 7. Pricing Matrix

Prices are defined in INR (₹) per single copy:

| Paper Size | Color Mode | Unit Price (INR) |
| :--- | :--- | :--- |
| **A4** | **BW** (Black & White) | ₹2.00 |
| **A4** | **COLOR** | ₹10.00 |
| **A3** | **BW** (Black & White) | ₹5.00 |
| **A3** | **COLOR** | ₹20.00 |

**Formula:** $\text{Total Price} = \text{copies} \times \text{UNIT\_PRICE}(\text{paperSize}, \text{colorMode})$

---

## 8. API Specification

### Base URLs
- Local Development: `http://localhost:5000`
- API Prefix: `/api/v1`

### Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server and database health probe |
| `POST` | `/api/v1/orders` | Atomically creates order, print job, and audit log |
| `GET` | `/api/v1/orders/:orderId` | Fetches order and print job details |
| `PATCH` | `/api/v1/orders/:orderId/status` | Transitions status via FSM verification |
| `POST` | `/api/v1/orders/:orderId/payment` | Simulates payment gateway outcome |
| `POST` | `/api/v1/orders/:orderId/print` | Starts printing hardware (PAID -> PRINTING) |
| `POST` | `/api/v1/orders/:orderId/print/complete` | Completes printing (PRINTING -> COMPLETED) |
| `POST` | `/api/v1/orders/:orderId/print/fail` | Reports hardware failure (PRINTING -> PRINT_FAILED) |
| `POST` | `/api/v1/orders/:orderId/cancel` | Cancels active order (CREATED, PAYMENT_PENDING, PAID) |
| `GET` | `/api/v1/orders/:orderId/audit-logs` | Fetches chronological audit trail |

---

### Request & Response Examples

#### 1. Create Order
**`POST /api/v1/orders`**
```json
{
  "customerId": "CUS001",
  "kioskId": "KIOSK001",
  "fileUrl": "https://example.com/file.pdf",
  "copies": 3,
  "paperSize": "A4",
  "colorMode": "BW"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "e2f18392-f04b-449e-bc4f-4d9bb10db0ee",
    "orderId": "ORD-20261008-F4A90C",
    "customerId": "CUS001",
    "kioskId": "KIOSK001",
    "fileUrl": "https://example.com/file.pdf",
    "copies": 3,
    "paperSize": "A4",
    "colorMode": "BW",
    "price": 6,
    "status": "CREATED",
    "createdAt": "2026-10-08T13:45:00.000Z",
    "updatedAt": "2026-10-08T13:45:00.000Z",
    "printJob": {
      "id": "b3e0c7a1-d779-4bc2-995a-69446dfcbf65",
      "orderId": "ORD-20261008-F4A90C",
      "kioskId": "KIOSK001",
      "status": "PENDING",
      "startedAt": null,
      "completedAt": null,
      "createdAt": "2026-10-08T13:45:00.000Z",
      "updatedAt": "2026-10-08T13:45:00.000Z"
    }
  }
}
```

#### 2. Process Payment Simulation
**`POST /api/v1/orders/ORD-20261008-F4A90C/payment`**
```json
{
  "success": true,
  "transactionRef": "UPI-REF-987654"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "orderId": "ORD-20261008-F4A90C",
    "status": "PAID"
  }
}
```

#### 3. Error Response (Invalid State Transition)
**`PATCH /api/v1/orders/ORD-20261008-F4A90C/status`**
```json
{
  "status": "CREATED"
}
```
**Response (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition order from PAID to CREATED",
    "details": {
      "fromStatus": "PAID",
      "toStatus": "CREATED"
    }
  }
}
```

#### 4. Validation Error Response
**`POST /api/v1/orders`** with negative copies:
```json
{
  "copies": -2
}
```
**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "field": "copies",
        "message": "copies must be greater than 0"
      }
    ]
  }
}
```

---

## 9. Setup & Installation Instructions

### 9.1 Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL (v14 or higher) running on localhost:5432

### 9.2 Clone & Install
```bash
git clone <repository-url>
cd smart-print-system
npm install
```

### 9.3 Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains valid PostgreSQL connection credentials:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:admin@localhost:5432/smart_print_db?schema=public"
LOG_LEVEL=info
```

### 9.4 Database Migration & Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed database with sample orders across kiosks KIOSK001, KIOSK002, KIOSK003
npm run prisma:seed
```

---

## 10. Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx watch src/server.ts` | Runs dev server with live reload |
| `npm run build` | `tsc` | Compiles TypeScript to `dist/` |
| `npm start` | `node dist/server.js` | Runs production compiled server |
| `npm test` | `dotenv -e .env.test -- jest --runInBand --detectOpenHandles --forceExit` | Runs entire automated test suite |
| `npm run test:watch` | `dotenv -e .env.test -- jest --watch --runInBand` | Runs tests in interactive watch mode |
| `npm run lint` | `eslint "src/**/*.ts" "tests/**/*.ts"` | Lints code using ESLint |
| `npm run format` | `prettier --write "src/**/*.ts" "tests/**/*.ts"` | Formats code with Prettier |
| `npm run prisma:generate` | `prisma generate` | Generates type-safe Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` | Applies Prisma migrations |
| `npm run prisma:seed` | `tsx prisma/seed.ts` | Seeds database with initial data |

---

## 11. Testing

The project includes unit and integration tests covering business logic, validation, and lifecycle flows:
- **Unit Tests:** Isolated testing of `PricingService`, `state-machine` transition matrix, and `order-id` collision resistance.
- **Integration Tests:** Supertest suite verifying full API lifecycles, database transactions, audit logging, and rejection of invalid status transitions.

To run the automated tests:
```bash
npm test
```

Expected output:
```text
Test Suites: 5 passed, 5 total
Tests:       76 passed, 76 total
Snapshots:   0 total
Time:        ~15 s
```

---

## 12. Postman Collection

An importable Postman collection is included in the project root:
- File: `Smart-Print-System.postman_collection.json`
- Includes pre-configured environment variables (`baseUrl`, `orderId`) and automated response test scripts that automatically capture `orderId` upon order creation.

To import:
1. Open Postman.
2. Click **Import**.
3. Select `Smart-Print-System.postman_collection.json`.

---

## 13. Git Workflow & Recommended Commits

Recommended clean Git commit structure:
1. `Initial project setup and configuration`
2. `Add PostgreSQL database schema and Prisma migrations`
3. `Add pricing service and unit tests`
4. `Add order state machine and transition guards`
5. `Add transactional order creation and print job creation`
6. `Add payment simulation and print workflow services`
7. `Add persistent PostgreSQL audit logging service`
8. `Add request validation and centralized error handling`
9. `Add comprehensive Jest and Supertest test suite`
10. `Add Postman collection, README, and documentation`

---

## 14. Future Improvements

1. **Distributed Locks (Redis/Redlock):** For multi-replica kiosk clusters handling high-frequency concurrent operations.
2. **WebSocket / SSE Feed:** Real-time push notifications of print spooler progress directly to the kiosk screen.
3. **Hardware Telemetry Integration:** Direct integration with printer SNMP / CUPS protocols for real-time ink level monitoring.
4. **Idempotency Keys:** HTTP `Idempotency-Key` headers for automated retry resilience from edge network kiosks.
