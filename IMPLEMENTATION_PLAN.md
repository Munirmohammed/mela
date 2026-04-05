# Mela — B2B Inventory & Delivery Platform for Ethiopian Small Shops

> "Mela" means market or fair in Amharic. We are the digital Merkato.

---

## Vision

Mela aggregates demand from thousands of small kiosks (suks) across Ethiopian cities.
Shop owners order wholesale goods through the app. Mela batches those orders by zone,
sends one truck to Merkato in the morning, buys at bulk discount, and delivers to all shops.
Revenue comes from the wholesale margin. Long-term moat: transaction data → micro-loans.

---

## Proven Model

- Kenya: Wasoko
- Nigeria: TradeDepot
- Ethiopia: Mela (us)

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Backend API  | Node.js + Express + TypeScript      |
| ORM          | Prisma                              |
| Database     | PostgreSQL                          |
| Queue/Jobs   | BullMQ                              |
| Cache        | Redis                               |
| Auth         | JWT + Refresh Tokens + OTP via SMS  |
| Payments     | Chapa (Ethiopian gateway)           |
| SMS          | Africa's Talking                    |
| Maps/Routes  | Google Maps API                     |
| File Storage | Cloudinary                          |
| Realtime     | Socket.io (delivery tracking)       |
| Frontend     | React + TypeScript + Vite           |
| UI Library   | shadcn/ui + Tailwind CSS            |
| State        | Zustand + React Query               |
| Mobile       | React Native (Phase 2)              |
| Monitoring   | Prometheus + Grafana                |
| Containers   | Docker + Docker Compose             |

---

## Repository Structure

```
mela/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── shops/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── aggregation/
│   │   │   ├── delivery/
│   │   │   ├── payments/
│   │   │   └── credit/
│   │   ├── jobs/
│   │   │   ├── aggregation.job.ts
│   │   │   ├── route-optimizer.job.ts
│   │   │   ├── notification.job.ts
│   │   │   └── scheduler.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── redis/
│   │   │   └── client.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── rate-limit.middleware.ts
│   │   ├── utils/
│   │   └── app.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── shop/
│   │   │   ├── orders/
│   │   │   ├── tracking/
│   │   │   ├── credit/
│   │   │   └── admin/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── api/
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── IMPLEMENTATION_PLAN.md
└── .gitignore
```

---

## Database Schema

### Core Models

```prisma
model Shop {
  id           String   @id @default(cuid())
  ownerName    String
  phone        String   @unique
  location     Json     // { lat, lng, address, city }
  zone         String   // "Bole", "Kirkos", "Yeka", "Arada"
  isVerified   Boolean  @default(false)
  creditScore  Float    @default(0)
  creditLimit  Float    @default(0)
  orders       Order[]
  loans        Loan[]
  createdAt    DateTime @default(now())
}

model Product {
  id             String      @id @default(cuid())
  name           String
  nameAm         String      // Amharic name
  category       String
  unit           String      // "kg", "piece", "carton", "liter"
  wholesalePrice Float
  retailPrice    Float
  minOrderQty    Int
  imageUrl       String?
  isAvailable    Boolean     @default(true)
  orderItems     OrderItem[]
}

model Order {
  id            String        @id @default(cuid())
  shop          Shop          @relation(fields: [shopId], references: [id])
  shopId        String
  status        OrderStatus   @default(PENDING)
  items         OrderItem[]
  totalAmount   Float
  paymentMethod PaymentMethod
  paymentStatus PaymentStatus @default(UNPAID)
  batch         DeliveryBatch? @relation(fields: [batchId], references: [id])
  batchId       String?
  scheduledFor  DateTime      // aggregation window date
  notes         String?
  createdAt     DateTime      @default(now())
}

model OrderItem {
  id        String  @id @default(cuid())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  unitPrice Float
}

model DeliveryBatch {
  id          String      @id @default(cuid())
  zone        String
  status      BatchStatus @default(AGGREGATING)
  orders      Order[]
  driver      Driver?     @relation(fields: [driverId], references: [id])
  driverId    String?
  route       Json?       // optimized waypoints array
  bulkList    Json?       // aggregated purchase list for Merkato
  scheduledAt DateTime
  startedAt   DateTime?
  deliveredAt DateTime?
  createdAt   DateTime    @default(now())
}

model Driver {
  id       String          @id @default(cuid())
  name     String
  phone    String          @unique
  vehicle  String
  isActive Boolean         @default(true)
  batches  DeliveryBatch[]
}

model Loan {
  id        String     @id @default(cuid())
  shop      Shop       @relation(fields: [shopId], references: [id])
  shopId    String
  amount    Float
  status    LoanStatus @default(ACTIVE)
  dueDate   DateTime
  repaidAt  DateTime?
  createdAt DateTime   @default(now())
}

enum OrderStatus   { PENDING CONFIRMED IN_TRANSIT DELIVERED CANCELLED }
enum BatchStatus   { AGGREGATING PURCHASING IN_TRANSIT DELIVERED }
enum PaymentMethod { CASH CHAPA CREDIT }
enum PaymentStatus { UNPAID PAID }
enum LoanStatus    { ACTIVE REPAID DEFAULTED }
```

---

## Backend Modules

### 1. Auth Module
- Phone number registration
- OTP via Africa's Talking SMS
- JWT access token (15min) + refresh token (7d) stored in Redis
- Middleware: `authenticate`, `requireAdmin`

### 2. Shops Module
- CRUD for shop profile
- Zone assignment based on GPS coordinates
- Shop verification flow (admin approves)

### 3. Products Module
- Product catalog with Amharic + English names
- Category filtering (grains, oils, cleaning, etc.)
- Admin: add/update/toggle availability

### 4. Orders Module
- Place order → joins next aggregation window
- Order window: orders placed before 9PM go into tomorrow's batch
- Real-time status updates via Socket.io
- Cancel order (only if batch not yet PURCHASING)

### 5. Aggregation Engine (BullMQ — Core Business Logic)
- Cron job fires at 9PM every night per zone
- Pulls all PENDING orders for that zone/window
- Aggregates items into a bulk purchase list
- Creates a DeliveryBatch record
- Notifies all shop owners via SMS
- Triggers route optimization job

```
Window closes (9PM)
      ↓
Aggregate orders by zone
      ↓
Build bulk purchase list (what to buy at Merkato)
      ↓
Create DeliveryBatch
      ↓
Assign driver
      ↓
Optimize delivery route (Google Maps)
      ↓
Driver picks up from Merkato (6AM)
      ↓
Deliver to all shops in zone
      ↓
Mark orders DELIVERED
      ↓
Trigger credit score recalculation
```

### 6. Delivery Module
- Driver app endpoints (assign batch, update status, mark delivered)
- Live location updates via Socket.io
- Route stored as ordered waypoints JSON

### 7. Payments Module
- Chapa integration for mobile money / card
- Cash on delivery option
- Credit (buy now, pay in 7 days — requires credit score > 50)
- Webhook handler for Chapa payment confirmation

### 8. Credit Module
- Credit score calculated after each completed order cycle
- Formula:
  - Order completion rate: 40 points
  - On-time loan repayment: 40 points
  - Account age + volume: 20 points
- Credit limit tiers: 0 / 2,000 ETB / 5,000 ETB / 10,000 ETB
- Loan application, disbursement, repayment tracking

---

## BullMQ Job Queues

| Queue                | Trigger              | Action                                      |
|----------------------|----------------------|---------------------------------------------|
| `order-aggregation`  | Cron 9PM daily       | Close window, build batch per zone          |
| `route-optimizer`    | After batch created  | Call Google Maps, store optimized route     |
| `sms-notification`   | Order/batch events   | Send SMS via Africa's Talking               |
| `credit-recalc`      | After delivery done  | Recalculate shop credit score               |
| `payment-retry`      | Failed payment       | Retry Chapa webhook processing              |

---

## API Endpoints

### Auth
```
POST /api/auth/register         - Register with phone
POST /api/auth/verify-otp       - Verify OTP, get tokens
POST /api/auth/refresh          - Refresh access token
POST /api/auth/logout
```

### Shop
```
GET  /api/shop/me               - Get own shop profile
PUT  /api/shop/me               - Update profile
```

### Products
```
GET  /api/products              - List catalog (with filters)
GET  /api/products/:id
POST /api/admin/products        - Add product (admin)
PUT  /api/admin/products/:id    - Update product (admin)
```

### Orders
```
POST /api/orders                - Place order
GET  /api/orders                - My order history
GET  /api/orders/:id            - Order detail + status
DELETE /api/orders/:id          - Cancel order
GET  /api/orders/:id/track      - Live tracking (Socket.io room)
```

### Delivery (Driver)
```
GET  /api/driver/batch          - Get assigned batch
PUT  /api/driver/batch/:id/start
PUT  /api/driver/batch/:id/deliver/:orderId
PUT  /api/driver/location       - Push live location
```

### Payments
```
POST /api/payments/initiate     - Start Chapa payment
POST /api/payments/webhook      - Chapa webhook
POST /api/payments/repay-loan   - Repay credit loan
```

### Credit
```
GET  /api/credit/score          - My credit score + limit
POST /api/credit/apply          - Apply for micro-loan
GET  /api/credit/loans          - Loan history
```

### Admin
```
GET  /api/admin/batches         - All batches + status
GET  /api/admin/orders          - All orders
GET  /api/admin/analytics       - Revenue, margins, zones
GET  /api/admin/shops           - All shops
PUT  /api/admin/shops/:id/verify
POST /api/admin/drivers         - Add driver
```

---

## Frontend Pages

### Shop Owner App
| Page              | Route              | Description                              |
|-------------------|--------------------|------------------------------------------|
| Login/Register    | `/auth`            | Phone + OTP flow                         |
| Home / Catalog    | `/`                | Browse products, add to cart             |
| Cart              | `/cart`            | Review order, choose payment             |
| Order Confirmation| `/orders/confirm`  | Order placed, next delivery window shown |
| My Orders         | `/orders`          | Order history + statuses                 |
| Live Tracking     | `/orders/:id/track`| Map with driver location                 |
| Credit            | `/credit`          | Score, limit, apply for loan             |
| Profile           | `/profile`         | Shop info, settings                      |

### Admin Dashboard
| Page              | Route              | Description                              |
|-------------------|--------------------|------------------------------------------|
| Overview          | `/admin`           | KPIs: orders, revenue, active zones      |
| Batches           | `/admin/batches`   | Today's batches, bulk purchase lists     |
| Orders            | `/admin/orders`    | All orders, filter by zone/status        |
| Shops             | `/admin/shops`     | Shop list, verify, credit scores         |
| Products          | `/admin/products`  | Catalog management                       |
| Analytics         | `/admin/analytics` | Revenue charts, zone heatmaps            |

---

## Phased Delivery

### Phase 1 — MVP (Weeks 1–6)
**Goal: First real delivery in Bole**
- [ ] Backend: Auth (phone + OTP), Shop registration
- [ ] Backend: Product catalog (manual seed)
- [ ] Backend: Order placement + basic aggregation (manual trigger)
- [ ] Backend: Chapa payment integration
- [ ] Backend: SMS notifications (Africa's Talking)
- [ ] Frontend: Shop owner app (catalog → cart → order)
- [ ] Frontend: Admin dashboard (view orders, trigger batch)
- [ ] Docker Compose setup (Postgres + Redis)
- [ ] Deploy to VPS (DigitalOcean / Hetzner)

**Commit milestones:**
- `feat: project scaffold + prisma schema`
- `feat: auth module (phone OTP + JWT)`
- `feat: product catalog API`
- `feat: order placement + aggregation engine`
- `feat: chapa payment integration`
- `feat: SMS notifications via Africa's Talking`
- `feat: shop owner frontend MVP`
- `feat: admin dashboard MVP`
- `chore: docker + deployment config`

### Phase 2 — Operations (Weeks 7–12)
**Goal: Scale to 3 zones, driver app live**
- [ ] Driver mobile app (React Native)
- [ ] Live delivery tracking (Socket.io + Google Maps)
- [ ] Route optimization (Google Maps Directions API)
- [ ] Automated aggregation cron (BullMQ scheduler)
- [ ] Order cancellation window
- [ ] Push notifications

**Commit milestones:**
- `feat: driver app (React Native)`
- `feat: live tracking with socket.io`
- `feat: route optimization job`
- `feat: automated aggregation scheduler`

### Phase 3 — Growth (Month 4–6)
**Goal: Micro-loans live, 500+ shops**
- [ ] Credit scoring engine
- [ ] Micro-loan application + disbursement
- [ ] Loan repayment via Chapa
- [ ] Analytics dashboard (revenue, margins, zone performance)
- [ ] Demand forecasting (which products, which zones)
- [ ] Referral system (shop owners invite other shops)

**Commit milestones:**
- `feat: credit scoring engine`
- `feat: micro-loan module`
- `feat: analytics dashboard`
- `feat: demand forecasting`

---

## Environment Variables

```env
# App
PORT=3000
NODE_ENV=development
JWT_SECRET=
JWT_REFRESH_SECRET=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mela

# Redis
REDIS_URL=redis://localhost:6379

# Africa's Talking (SMS)
AT_API_KEY=
AT_USERNAME=

# Chapa (Payments)
CHAPA_SECRET_KEY=
CHAPA_WEBHOOK_SECRET=

# Google Maps
GOOGLE_MAPS_API_KEY=

# Cloudinary
CLOUDINARY_URL=
```

---

## Revenue Model

| Stream              | How                                                    |
|---------------------|--------------------------------------------------------|
| Wholesale margin    | Buy at bulk price, sell at slightly above wholesale    |
| Delivery fee        | Small flat fee per delivery (20–50 ETB)                |
| Micro-loan interest | 5–10% flat fee on 7-day credit loans                   |
| Premium listings    | Suppliers pay to feature products                      |
| Data insights       | Sell anonymized demand data to FMCG brands (Phase 3+)  |

---

## Why This Wins in Ethiopia

1. Merkato is the largest open-air market in Africa — supply is there
2. Telebirr + CBE Birr = mobile money infrastructure exists
3. Africa's Talking has Ethiopia coverage for SMS OTP
4. Chapa is the leading Ethiopian payment gateway
5. No dominant player yet (Wasoko/TradeDepot not in Ethiopia)
6. Shop owners already trust group buying (edir/equb culture)

---

*Let's build.*
