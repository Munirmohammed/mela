# Mela — Master Plan (v2)

> The digital Merkato. A B2B group-buying, delivery & embedded-finance platform
> for Ethiopian kiosks (suks). Native apps, built to scale to millions, built to launch.

**Status of this doc:** Strategic + architecture plan. The detailed task-by-task
implementation plan is produced *after* this is approved.

**Decisions locked (2026-05-30):**
- Mobile = **Expo React Native** (Shop-owner app + Driver app), cross-platform iOS/Android.
- Web = **Admin/Ops dashboard** + **Supplier/wholesaler portal**.
- Backend = **scalable modular monolith** (not microservices yet) — built to scale to millions.
- Goal = **real product to launch** in Addis Ababa. Quality bar: reliability, payments, offline-first, ops tooling.

---

## 1. What Mela is (sharpened)

Thousands of small kiosks each buy tiny quantities at retail-ish prices and waste hours
traveling to Merkato. Mela aggregates their demand by **zone**, sends one truck to buy
in bulk, and delivers to every shop the next morning. The margin between bulk and what
shops pay is revenue. The real moat is **data → credit**: every order builds a repayment
and volume history that underwrites micro-loans no bank will offer these shops.

**Revenue streams:** wholesale margin · delivery fee · BNPL/loan fees · supplier premium
listings · (later) anonymized demand data to FMCG brands.

**Why it wins here:** Merkato is the supply; Telebirr/CBE Birr/Chapa are the rails;
equb/edir culture means group-buying is already trusted; no dominant incumbent in Ethiopia.

---

## 2. The four surfaces

| # | Surface | Platform | Primary users | Core job |
|---|---------|----------|---------------|----------|
| 1 | **Shop-owner app** | Expo RN (iOS/Android) | Kiosk owners | Browse → order → track → pay → borrow |
| 2 | **Driver app** | Expo RN (iOS/Android) | Delivery drivers | Pick up at Merkato → optimized route → deliver → reconcile cash |
| 3 | **Admin / Ops dashboard** | Web (React) | Mela operations | Run batches, verify shops, manage catalog/drivers, analytics, fraud |
| 4 | **Supplier portal** | Web (React) | Merkato wholesalers | List products & prices, receive bulk orders, fulfill, get paid |

All four share **one backend**, one design system, one set of types, via a **monorepo**.

---

## 3. Feature set — finish what exists + the ideas that make it "the best"

### 3a. Finish / harden (already partly built)
- Payments: **real Chapa integration** (Telebirr, CBE Birr, card) + webhooks + idempotency.
- **Route optimization** worker (queue exists, worker missing).
- **Live delivery tracking** map with ETA (socket.io scaffolding exists, no UI).
- **Image uploads** (Cloudinary/S3 — multer installed, unused).
- **Audit logging** actually written (model exists, never used).
- Full batch lifecycle: AGGREGATING → PURCHASING → IN_TRANSIT → DELIVERED with transitions.
- Credit recalculation after every delivery (currently only on loan repay).
- Shop **profile** page (routed but missing in web).
- **Tests** (currently zero) + CI.

### 3b. New features — the differentiators

**Shop-owner app**
- **Offline-first ordering** — browse, build cart, place orders with no/poor signal; sync when back online (critical in Addis). Mutation queue + optimistic UI.
- **Amharic-first UX** + multi-language (Afaan Oromo, Tigrinya, English) via i18n. Optional **voice/large-icon mode** for low-literacy users.
- **One-tap reorder / "buy again"** from past batches; smart cart suggestions from purchase history.
- **In-app wallet & ledger** — top up via Telebirr/CBE/Chapa, pay from balance, see every transaction.
- **BNPL / micro-credit** (have scoring) + a **gamified credit-score** screen showing how to raise the limit.
- **Mela Points / loyalty** — tiers, rewards, streaks for on-time repayment & volume.
- **Equb-style group buy** — nearby shops pool an order to unlock deeper bulk discounts (culturally native).
- **Flash deals / volume discounts** surfaced on the catalog.
- **Shop analytics** — what you buy most, spend over time, low-stock reminders.
- **Live order tracking** — driver on a map, ETA, push + SMS updates.
- **Ratings & reviews** on products and delivery.
- **Referral program** — invite a shop, both earn credit.
- **In-app support / chat** + help center in Amharic.

**Driver app**
- Assigned batch with **optimized multi-stop route** (Google/Mapbox Directions) + turn-by-turn handoff.
- **Live GPS broadcast** (battery-aware) → shops + ops see location.
- **Proof of delivery** — photo + recipient OTP/signature per stop.
- **Cash reconciliation** — collect COD, track cash-in-hand, settle at day end.
- **Earnings dashboard** + delivery history.
- Offline route caching (signal drops mid-route).

**Admin / Ops dashboard**
- Live **ops control center** — batches on a map, statuses, driver positions.
- **Bulk purchase list** per batch (what to buy at Merkato) with supplier assignment.
- Catalog, shop verification, driver management, **manual + scheduled aggregation**.
- **Analytics & BI** — revenue, margin per zone, cohort retention, batch P&L, demand heatmaps.
- **Demand forecasting** — predict per-zone/product demand to pre-buy.
- **Credit & risk** — loan book, default rates, exposure, manual overrides.
- **Fraud / anti-abuse** signals (duplicate shops, abnormal ordering).
- **Feature flags** + broadcast announcements/promos.

**Supplier portal**
- Supplier onboarding + product/price catalog they control.
- Receive **bulk purchase orders** from Mela, accept/counter, mark fulfilled.
- Settlement/payout view.
- Quote/bid system so multiple suppliers compete on a bulk list (drives margin down for Mela).

---

## 4. Target architecture (scalable monolith)

```
                         ┌────────────────────────────────────────┐
   Shop app (Expo RN) ───┤                                          │
   Driver app (Expo RN)──┤   CDN / Edge  →  Load Balancer           │
   Admin web (React)  ───┤        │                                 │
   Supplier web (React)──┘        ▼                                 │
                          ┌───────────────┐   stateless, N replicas │
                          │  API (Express │◄──── horizontal scale   │
                          │  modular      │                         │
                          │  monolith)    │                         │
                          └──┬───────┬────┘                         │
              ┌──────────────┘       └───────────────┐              │
              ▼                                       ▼              │
   ┌────────────────────┐                  ┌────────────────────┐   │
   │ PostgreSQL primary │  read replicas   │  Redis             │   │
   │ + PgBouncer pool   │◄──────────────►  │  cache · sessions  │   │
   │ partitioned tables │                  │  BullMQ · pub/sub  │   │
   └────────────────────┘                  └─────────┬──────────┘   │
                                                      ▼              │
                          ┌─────────────────────────────────────┐   │
                          │  Worker fleet (BullMQ, separate proc)│   │
                          │  aggregation · route-opt · sms/push  │   │
                          │  credit-recalc · payments · outbox   │   │
                          └─────────────────────────────────────┘   │
   Object storage (S3/R2/Cloudinary) · Search (PG FTS→Meilisearch)  │
   Observability: Sentry · Prometheus/Grafana · OpenTelemetry        │
                          └────────────────────────────────────────┘
```

**Scale principles (so it *can* reach millions without a rewrite):**
- **Stateless API**, horizontally scaled behind a load balancer. No in-memory session state (Redis-backed).
- **Workers separate from API** — heavy jobs never block request threads.
- **Postgres done right** — proper indexes, `PgBouncer` pooling, read replicas for analytics/reads, time-partition high-volume tables (orders, audit_log, notifications), pagination everywhere (no unbounded queries).
- **Redis** for caching, rate limiting, OTP/session store, BullMQ, and **socket.io Redis adapter** so realtime scales across API replicas.
- **Idempotency keys** on orders & payments; **transactional outbox** for payments/notifications so nothing is lost or double-sent.
- **CDN + image optimization** — small payloads for expensive/slow mobile data.
- **Observability from day one** — Sentry (errors), structured logs (Winston, already there), metrics (Prometheus), tracing (OTel).
- **Feature flags** to ship safely; **migrations** gated in CI.

We stay a **modular monolith** (clear module boundaries: auth, catalog, orders, aggregation, delivery, payments, credit, suppliers, notifications). If one module ever needs independent scale, its clean boundary lets it become a service later — but we don't pay that complexity tax now.

---

## 5. Tech stack

| Layer | Choice | Why (Ethiopia-aware) |
|-------|--------|----------------------|
| **Monorepo** | Turborepo + pnpm workspaces | One repo: 4 apps + shared `types`, `api-client`, `ui`, `config`. No drift. |
| **Mobile** | Expo React Native + expo-router | One codebase → iOS+Android; OTA updates; reuse TS skills. Android-first. |
| **Mobile offline** | TanStack Query + persistence + MMKV; mutation queue | Orders must survive bad signal. |
| **Mobile maps** | react-native-maps (Google) | Solid Addis coverage; Mapbox as fallback. |
| **Push** | Expo Notifications → FCM (+ SMS fallback) | Android-dominant; SMS for no-data users. |
| **Web (admin+supplier)** | React + Vite + Tailwind + shadcn/ui + TanStack Query | Reuse existing web stack; finally use the installed shadcn deps. |
| **Backend** | Node + Express + TypeScript (modular monolith) | Keep the working ~60%; harden, don't rewrite. |
| **ORM/DB** | Prisma + PostgreSQL | Already in place; strong typing. |
| **Cache/Queue/RT** | Redis + BullMQ + socket.io (Redis adapter) | Already in place; add adapter for scale. |
| **Payments** | **Chapa** (primary: Telebirr, CBE Birr, card) + wallet ledger | Leading ET gateway, one integration covers the rails. |
| **SMS/OTP** | Africa's Talking **or AfroMessage** (ET-local, better deliverability) | Evaluate both; AfroMessage tuned for Ethiopia. |
| **Storage/CDN** | Cloudinary or S3-compatible (R2/Spaces) + CDN | Image optimization for slow data. |
| **i18n** | i18next | Amharic, Afaan Oromo, Tigrinya, English. |
| **Auth** | OTP + JWT access/refresh; expo-secure-store on device | Phone-first; no passwords to forget. |
| **Observability** | Sentry + Prometheus/Grafana + OpenTelemetry | Know it broke before shops call. |
| **CI/CD** | GitHub Actions → test/build → deploy; EAS for app builds | Repeatable, gated releases. |
| **Hosting** | Containers on Hetzner/DO/Fly + managed Postgres/Redis | Cheap, EU-near latency, scalable. |

---

## 6. Data model evolution

Keep the 13 existing models. Add / extend:
- **Wallet** + **WalletTransaction** (ledger: top-ups, payments, refunds, settlements).
- **Payment** (Chapa tx, status, idempotency key) — separate from Order for retries/webhooks.
- **Supplier** + **SupplierProduct** + **PurchaseOrder** (Mela→supplier bulk buys, quotes).
- **DeliveryStop** + **ProofOfDelivery** (per-shop stop, photo, OTP, timestamp, GPS).
- **DriverLocation** (time-series, or Redis + periodic snapshot).
- **Review** (product & delivery ratings).
- **Referral**, **LoyaltyAccount** / **PointsLedger**.
- **DeviceToken** (push), **FeatureFlag**, **OutboxEvent** (reliable delivery).
- Extend **AuditLog** usage everywhere; partition **Order**/**Notification**/**AuditLog** by time.

---

## 7. Non-functional must-haves before "launch"

- **Payments correctness** — idempotency, webhook signature verification, reconciliation, no double-charge.
- **Offline resilience** — app fully usable on flaky 3G; orders queue & sync.
- **Security** — Helmet/CORS/rate-limit (have), input validation (Zod, have), secrets manager, least-privilege DB, signed webhooks, PII handling, OWASP pass, dependency scanning.
- **Reliability** — health checks, graceful shutdown (have), retries with backoff, dead-letter queues, DB backups + restore drill.
- **Performance budget** — fast cold start on low-end Android; p95 API < 300ms; image sizes capped.
- **Observability** — error tracking, dashboards, alerting on queue depth / payment failures / error rate.
- **Compliance/ops** — terms, data retention, driver cash handling, refund policy.

---

## 8. Phased roadmap (high-level — detailed tasks come next)

**Phase 0 — Foundation (restructure, no new features)**
Monorepo (Turborepo/pnpm) · shared `types` + `api-client` + `ui` packages · move existing backend+web in · CI pipeline · Sentry + test harness · Dockerized dev. *Outcome: clean base, nothing lost.*

**Phase 1 — Backend completion & hardening**
Finish payments (Chapa+wallet+outbox) · route-optimizer worker · delivery lifecycle + POD · image uploads · audit logging · credit recalc on delivery · socket.io Redis adapter · indexes/pagination/partitioning · seed + tests. *Outcome: API is production-grade and complete.*

**Phase 2 — Shop-owner app (Expo RN)**
Auth/OTP · offline-first catalog/cart/order · wallet · order tracking map · credit · loyalty · reorder · i18n · push. *Outcome: the money-maker ships.*

**Phase 3 — Driver app (Expo RN)**
Batch + optimized route · live GPS · POD · cash reconciliation · earnings · offline. *Outcome: deliveries run on the app.*

**Phase 4 — Admin/Ops + Supplier portal (web)**
Ops control center + map · analytics/BI · demand forecasting · credit/risk · fraud · feature flags · supplier onboarding/catalog/PO/quotes/settlement. *Outcome: Mela can be operated & supplied at scale.*

**Phase 5 — Scale & launch hardening**
Load testing · read replicas · CDN · alerting/dashboards · backup/restore drill · security review · app-store submission (EAS) · pilot in one Bole zone → expand.

---

## 9. Open questions to resolve before/at implementation-plan time
- Confirm payment provider priority (Chapa-only vs Chapa + direct Telebirr).
- SMS provider: Africa's Talking vs AfroMessage (deliverability test).
- Hosting target (Hetzner vs DO vs Fly) — affects CI/CD wiring.
- Keep Express modular monolith (recommended) vs migrate to NestJS for structure.
- Map provider (Google vs Mapbox) — coverage/cost test in Addis.

---

*Next step: on approval, produce the detailed, task-level Implementation Plan (Phase 0 first), then start building Phase 0.*
