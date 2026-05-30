# Mela — Implementation Plan: Phase 0 + Phase 1

> Detailed, task-level plan. Cadence = plan-and-confirm per phase.
> Backend decision = keep Express modular monolith, harden it (no NestJS rewrite).
> Companion to [MASTER_PLAN.md](MASTER_PLAN.md).

---

## Phase 0 — Monorepo Foundation
**Goal:** restructure into a clean monorepo with shared packages, CI, tests, and error
tracking. **Zero features added, nothing lost.** Existing backend + web keep working.

### Target layout
```
mela/
├── apps/
│   ├── api/            # was backend/  (Express modular monolith + workers)
│   ├── admin-web/      # was frontend/ (admin/ops; supplier split out later)
│   ├── shop-mobile/    # Phase 2 — Expo RN (scaffold only in P0)
│   └── driver-mobile/  # Phase 3 — Expo RN (later)
├── packages/
│   ├── types/          # shared TS types + DTOs (Prisma-derived)
│   ├── api-client/     # shared HTTP client + endpoint definitions
│   ├── ui-web/         # shared shadcn/Tailwind components (web)
│   └── config/         # shared tsconfig / eslint / prettier / tailwind presets
├── turbo.json
├── pnpm-workspace.yaml
├── package.json        # root workspace + turbo scripts
└── docker-compose.yml  # postgres, redis, api, worker, admin-web
```

### Tasks
| # | Task | Deliverable / acceptance |
|---|------|--------------------------|
| 0.1 | Adopt **pnpm + Turborepo** at root | `pnpm-workspace.yaml`, `turbo.json`, root scripts: `dev/build/test/lint/typecheck` run across apps |
| 0.2 | Move `backend/` → `apps/api/`, `frontend/` → `apps/admin-web/` | Both still run; imports/paths fixed |
| 0.3 | Create `packages/config` | Shared `tsconfig.base.json`, eslint, prettier, tailwind preset; apps extend them |
| 0.4 | Create `packages/types` | Shared enums/DTOs; re-export Prisma types; admin-web imports from it (no duplication) |
| 0.5 | Create `packages/api-client` | Extract `endpoints.ts` + axios client; typed; admin-web consumes it (mobile reuses later) |
| 0.6 | Create `packages/ui-web` (stub) | Move 1–2 shared components (Button/Card) as proof; expand later |
| 0.7 | **Test harness** | Vitest configured for `api` + `admin-web`; 2–3 smoke tests pass |
| 0.8 | **CI** (GitHub Actions) | On PR: install → typecheck → lint → test → build → `prisma validate`. Green pipeline |
| 0.9 | **Sentry** wiring (api + web) | Behind `SENTRY_DSN` env; no-op if unset |
| 0.10 | **Dockerized dev** updated | `docker-compose up` brings up postgres+redis+api+worker+admin-web; build contexts fixed |
| 0.11 | Consolidate env | One documented `.env.example` per app; `.env` git-ignored; README dev-onboarding section |
| 0.12 | Update docs | `MASTER_PLAN.md` layout matches reality; root `README.md` with “how to run” |

**Phase 0 done when:** `pnpm install && pnpm dev` runs api + admin-web from the monorepo,
`pnpm test` and CI are green, Sentry initializes, and nothing that worked before is broken.

---

## Phase 1 — Backend Completion & Hardening
**Goal:** the API becomes **complete and production-grade** — payments, delivery lifecycle,
routing, media, credit automation, audit, and the scale/reliability primitives. This is what
all four clients depend on.

### 1A — Payments & Wallet (highest priority)
| # | Task | Acceptance |
|---|------|-----------|
| 1.1 | `Payment` model + migration (status, provider, chapaRef, **idempotencyKey**, amount) | Migration applies; unique idempotency key |
| 1.2 | **Chapa** service: `initiate`, `verify` | Real API calls; sandbox tested |
| 1.3 | **Webhook** handler with **signature verification** + raw-body parsing | Invalid signatures rejected; valid ones update Payment+Order atomically |
| 1.4 | **Wallet** + **WalletTransaction** ledger | Top-up, pay-from-wallet, refund; balance always = sum(ledger); never negative without credit |
| 1.5 | **Transactional outbox** + outbox worker | Payment/notification events written in same tx, delivered async, exactly-once-ish |
| 1.6 | Wire `payment-retry` queue worker | Failed webhooks retried with backoff → dead-letter after N |
| 1.7 | **Idempotency middleware** for order placement + payment initiate | Duplicate client retries don’t double-create |

### 1B — Delivery lifecycle, routing & tracking
| # | Task | Acceptance |
|---|------|-----------|
| 1.8 | Batch state machine endpoints: AGGREGATING→PURCHASING→IN_TRANSIT→DELIVERED | Illegal transitions rejected; audit-logged |
| 1.9 | `DeliveryStop` + `ProofOfDelivery` models | One stop per order in batch; POD = photo + recipient OTP + GPS + timestamp |
| 1.10 | Driver endpoints: get batch, start, arrive-at-stop, deliver(+POD), push location | Auth = DRIVER role; deliver marks order DELIVERED |
| 1.11 | **route-optimizer worker** (Google/Mapbox Directions) | Populates `batch.route` ordered waypoints after batch created |
| 1.12 | **socket.io Redis adapter** + driver-location persistence | Realtime works across multiple API replicas; location snapshots stored |
| 1.13 | Order tracking endpoint/room | Shop can subscribe; receives status + driver location + ETA |

### 1C — Media, catalog, shop, credit
| # | Task | Acceptance |
|---|------|-----------|
| 1.14 | **Image upload** (multer → Cloudinary/S3) | Product images + POD photos; size/type validated; CDN URL returned |
| 1.15 | **Shop profile** endpoints (`GET/PUT /shops/me`, stats) | Owner can read/update profile; basic spend stats |
| 1.16 | **credit-recalc worker**; recalc after every DELIVERED order | `creditQueue` wired; score updates automatically, not only on loan repay |

### 1D — Cross-cutting: scale, security, reliability, observability
| # | Task | Acceptance |
|---|------|-----------|
| 1.17 | **Audit logging** util applied to all mutations | Order/loan/shop/batch/payment changes write AuditLog |
| 1.18 | **DB indexes + pagination** | Indexes on phone, zone, status, scheduledFor, batchId, createdAt; every list endpoint paginated |
| 1.19 | **Partitioning plan** for Order / Notification / AuditLog | Documented + migration for time-partitioning (or pgpartman) |
| 1.20 | **Health/readiness** + **metrics** endpoints | `/healthz`, `/readyz`, Prometheus `/metrics` (queue depth, req latency, error rate) |
| 1.21 | **Worker process split** | Separate worker entrypoint + docker service; API never runs heavy jobs inline |
| 1.22 | Security pass | Webhook raw-body, rate-limit tuning, helmet review, secrets, dependency scan in CI |
| 1.23 | **OpenAPI/Swagger** generation | Served at `/docs`; the 4 clients have a contract |
| 1.24 | **Seed expansion** | Realistic catalog, shops, drivers, a sample batch + payments for demos |
| 1.25 | **Integration tests** for critical flows | auth+OTP, place order, aggregation→batch, payment webhook, delivery+POD, credit recalc |

**Phase 1 done when:** a shop can be created → order placed (idempotent) → aggregated into a
batch → route optimized → driver delivers with POD → payment settled (Chapa or wallet) →
credit recalculated, **all covered by tests**, observable via metrics/Sentry, and the API is
documented at `/docs`.

---

## Sequencing & risk notes
- **Do Phase 0 fully before Phase 1** — moving working code is the riskiest step; isolate it.
- Within Phase 1: **1A (payments) → 1B (delivery) → 1C → 1D**, but 1D items (indexes, audit,
  health, tests) land incrementally alongside each feature, not all at the end.
- Each task: small PR-sized change, typecheck + tests green before moving on.
- External keys needed during 1A/1B: **Chapa** (sandbox), **SMS** provider, **maps** key,
  **storage** (Cloudinary/S3). I’ll stub providers behind interfaces so dev works without keys.

---

## What I need from you to start Phase 0
1. **Go-ahead** to begin Phase 0 (monorepo restructure).
2. Confirm **pnpm** is acceptable (vs npm/yarn) — recommended for monorepos.
3. Anything in this plan to add/cut/reorder.

*On approval I’ll start Phase 0 task 0.1 and work down, checking in at the end of Phase 0 before Phase 1.*
