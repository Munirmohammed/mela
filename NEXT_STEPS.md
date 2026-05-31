# Mela — Next Steps & Run Guide

> Pick-up-anytime guide. **Part A** = how to run the backend + shop app on your
> iPhone (do this first). **Part B** = remaining phases in detail. **Part C** =
> backlog/follow-ups. **Part D** = git/merge.
>
> Companion docs: [MASTER_PLAN.md](MASTER_PLAN.md) · [PLAN_PHASE_0_1.md](PLAN_PHASE_0_1.md) · [PLAN_PHASE_2.md](PLAN_PHASE_2.md)

## Where we are
- **Done:** Phase 0 (monorepo), Phase 1 (full backend), Phase 2 (shop-owner Expo app).
- **Branch:** everything is on `phase-0-monorepo` — **not merged to `main`** yet.
- **Verified:** typecheck + tests + build pass across the monorepo (Turbo).
- **Not yet run for real:** Postgres-backed API and the mobile app on a device.

---

# PART A — Run it locally + on your iPhone

You do **not** need a Mac for this. Expo Go on your iPhone connects to Metro
running on your Windows machine over Wi‑Fi. (A Mac/EAS is only needed later to
ship a standalone build to the App Store.)

### 0. Prerequisites
- Docker Desktop running (for Postgres + Redis)
- Node ≥ 20, pnpm (already used in this repo)
- iPhone + Windows PC **on the same Wi‑Fi network**
- **Expo Go** app installed on the iPhone (from the App Store)

### 1. Start Postgres + Redis
```powershell
cd c:\Users\yeabs\Desktop\me\mela
docker compose up -d postgres redis
```

### 2. Configure the API env
```powershell
Copy-Item apps\api\.env.example apps\api\.env
```
Then edit `apps/api/.env` and set **at minimum**:
```env
# Required (the API refuses to boot without these):
JWT_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me

# IMPORTANT: docker-compose maps Postgres to host port 5433 (not 5432):
DATABASE_URL=postgresql://mela:secret@localhost:5433/meladb
REDIS_URL=redis://localhost:6379

# Allow the API to run workers in-process for local dev:
RUN_WORKERS_IN_API=true
```
> Leave Chapa / SMS / Maps / Cloudinary keys blank — the code uses safe **stubs**
> when they're unset (fake checkout URL, OTP printed to the console, local route
> optimizer, fake upload URLs).

### 3. Create the schema + seed data
```powershell
pnpm --filter @mela/api exec prisma migrate deploy
pnpm --filter @mela/api run db:seed
```
This loads the catalog, an admin, a test driver, and two test shops (one with a
funded wallet). Seeded shop phone: `+251911111111`.

### 4. Run the API
```powershell
pnpm dev:api
```
Watch the console — it prints `🚀 Mela API running on port 3000`. **In dev, OTP
codes are printed here** (the SMS provider logs instead of sending), so this is
where you'll read the login code.

### 5. Point the app at your PC's LAN IP
Find your IPv4 address:
```powershell
ipconfig   # look for "IPv4 Address" on your Wi-Fi adapter, e.g. 192.168.1.23
```
Create `apps/shop-mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000/api/v1
```
> Use your real IP. `localhost` will NOT work from the phone — it must be the
> PC's network IP. Expo only exposes vars prefixed `EXPO_PUBLIC_`.

### 6. Start the app & open it on your iPhone
```powershell
cd apps\shop-mobile
pnpm dev          # runs `expo start`
```
- A QR code appears in the terminal.
- On the iPhone: open the **Camera** app, point at the QR, tap the banner to open
  in **Expo Go**. (Same Wi‑Fi required.)
- If it can't connect, in the Expo terminal press `s` to switch to **tunnel**
  mode (works across networks/firewalls), then re-scan.

### 7. Try the flow
1. Register a new shop (or log in with `+251911111111`).
2. Read the **OTP from the API console** (step 4) and enter it.
3. Browse the catalog → add to cart → place an order (try airplane mode to see it
   queue offline, then reconnect to watch it sync).
4. Open Orders → an order → Track (a map; live driver dot appears once a driver
   is moving — you can simulate that later from the driver app or admin).
5. Wallet → top up (opens the Chapa stub URL) / see credit + points.

### What works in Expo Go vs. needs a dev build
| Feature | Expo Go | Notes |
|---|---|---|
| Auth, catalog, cart, orders, wallet, credit, i18n | ✅ | fully usable |
| Maps (tracking) | ✅ | Apple Maps on iOS, no key needed |
| Secure token storage | ✅ | expo-secure-store |
| **Push notifications** | ⚠️ limited | real Expo push needs a **dev build** + EAS `projectId`; our code fails gracefully in Expo Go |

### Optional: EAS dev build (later, for full push + custom native)
```powershell
npm i -g eas-cli
eas login
cd apps\shop-mobile
eas build --profile development --platform ios   # needs an Apple account; produces an installable dev client
```
This is only needed when you want production-grade push and to test outside Expo Go.

### Troubleshooting
- **Phone can't reach API:** same Wi‑Fi? correct LAN IP in `.env`? Windows
  Firewall may block Node — allow it, or use Expo **tunnel** mode (`s` in the
  Expo terminal). Confirm `http://<LAN-IP>:3000/health` loads in the phone's browser.
- **DB connection refused:** ensure Docker is up and you used port **5433** in
  `DATABASE_URL`.
- **Metro can't resolve `@mela/*`:** run `pnpm install` at the repo root, then
  `cd apps/shop-mobile && pnpm dev -- -c` (clears Metro cache).
- **Stale cache / weird errors:** `expo start -c` to reset.
- **Env change not picked up:** restart `expo start` after editing `.env`.

---

# PART B — Remaining phases (detailed)

## Phase 3 — Driver app (Expo React Native)
A second Expo app, `apps/driver-mobile`, reusing `@mela/types` + `@mela/api-client`
(the `delivery.*` methods already exist). Mirrors the shop app's foundation.

- **3A Foundation** — scaffold `apps/driver-mobile` (copy the shop app's Metro/
  config/theme/session/i18n setup); auth as a DRIVER (phone+OTP); tab/stack shell
  (Today / History / Profile).
- **3B Today's batch** — `GET /delivery/batch`: show assigned batch, bulk pickup
  list for Merkato, and the **ordered stop list** (sequence from the route
  optimizer). "Start delivery" → `IN_TRANSIT`.
- **3C Navigation & stops** — map with the optimized route + stop pins; per-stop:
  "Arrive" → "Deliver". Turn-by-turn handoff to Apple/Google Maps via deep link.
- **3D Proof of delivery** — at each stop: capture **photo** (expo-camera/
  image-picker → `POST /uploads` → url), recipient **OTP/name**, GPS; submit via
  `delivery.deliver`. Auto-complete batch when all stops done.
- **3E Live location broadcast** — battery-aware `expo-location` background/
  foreground updates → `delivery.pushLocation` (drives shop tracking + ETA).
- **3F Cash reconciliation & earnings** — collect COD per stop, running
  cash-in-hand, end-of-day settlement summary; deliveries/earnings history.
  *(Backend add: a simple settlement/earnings endpoint + maybe a `Settlement` model.)*
- **3G Offline** — cache the batch + queue POD submissions when offline (same
  mutation-queue pattern as the shop app).

**Done when:** a driver logs in, sees the batch, follows the route, delivers each
stop with proof, broadcasts location, and reconciles cash — end to end.

## Phase 4 — Admin/Ops dashboard + Supplier portal (web)
Build on the existing `apps/admin-web` (React + Vite). Replace its `any`-typed
calls with the typed `@mela/api-client`, and migrate pages to `@mela/ui-web`.

**4A Ops control center**
- Live batches board (status columns) + a map of in-progress batches & drivers.
- Batch detail: bulk purchase list, assign driver, advance status
  (`/admin/batches/:id/assign-driver`, `/status`), view stops + POD.

**4B Analytics & BI**
- Revenue, margin per zone, orders/day, cohort retention, batch P&L.
- Demand heatmap by zone/product; **demand forecasting** (start simple: trailing
  averages per zone/product → later a model). *(Backend: analytics endpoints +
  read-replica reads.)*

**4C Catalog, shops, drivers, credit/risk**
- Product CRUD + image upload (already supported); shop verification queue;
  driver management; **loan book / default rate / exposure** view; manual credit
  overrides; fraud signals (duplicate shops, abnormal ordering).

**4D Feature flags & announcements** — toggle features; broadcast promos/notices.

**4E Supplier portal** *(new surface — could be a route group in admin-web or a
separate `apps/supplier-web`)*
- Supplier onboarding + product/price catalog they control.
- Receive **purchase orders** from Mela (the batch bulk lists) → accept/counter →
  mark fulfilled. Settlement/payout view.
- (Stretch) **quote/bid** system so multiple suppliers compete on a bulk list.
- *(Backend: `Supplier`, `SupplierProduct`, `PurchaseOrder` models + endpoints.)*

## Phase 5 — Scale & launch hardening
- **Real DB run + load test** (k6/Artillery): exercise order→batch→deliver→pay at
  volume; tune indexes; verify pagination everywhere.
- **Read replica** wiring (`DATABASE_REPLICA_URL` + a read-only Prisma client) for
  analytics/catalog/admin reads (see `docs/PARTITIONING.md`).
- **Execute partitioning** if/when the trigger conditions hit (Order/Notification/
  AuditLog by month + pg_partman).
- **Observability in prod:** ship metrics to Prometheus/Grafana, Sentry DSNs set,
  alerts on payment-failure rate / queue depth / error rate.
- **Backups + restore drill**; secrets manager; dependency + image scanning.
- **Security review** (the `/security-review` skill) on the full diff.
- **App store delivery:** EAS production builds (iOS + Android), store listings,
  OTA update channel.
- **Pilot:** one Bole zone with real shops → iterate → expand zones.

---

# PART C — Backlog / follow-ups (don't forget)
- **Order-placement idempotency header:** the shop app queues orders offline; add
  an `Idempotency-Key` to `api-client.orders.place` (and pass a per-attempt key)
  so a resumed mutation can never double-create. (Backend already supports the
  header via the idempotency middleware.)
- **Run the integration tests for real:** bring up Postgres and run
  `pnpm --filter @mela/api run test:integration` (they currently only run in CI).
  Then expand coverage (delivery→POD→credit, aggregation→batch).
- **Apply migrations to a real DB** at least once and sanity-check the
  offline-generated SQL (`prisma migrate deploy`); consider switching to
  `prisma migrate dev` going forward now that a DB exists.
- **Auth hardening:** rate-limit OTP requests per phone; OTP attempt lockout.
- **api-client:** consider returning typed errors; add the remaining admin/driver
  methods as those apps need them.
- **Web app modernization:** the existing `admin-web` still has some `any`-typed
  API calls + a missing Profile page — clean up during Phase 4.
- **Push in Expo Go:** wire EAS `projectId` so `getExpoPushTokenAsync` works in a
  dev build; test real push end-to-end.
- **Accessibility / low-end Android pass** before launch (performance budget).

---

# PART D — Git / merge
- All work is on branch **`phase-0-monorepo`** (Phase 0 + 1 + 2), nothing on `main`.
- When ready: open a PR `phase-0-monorepo → main` (squash or keep the per-wave
  history — the commits are clean and scoped). Run CI (it'll execute unit +
  integration jobs).
- Suggested: merge after a real local DB run confirms the backend boots and the
  app talks to it on your iPhone.

---

## Quick command reference
```powershell
# infra
docker compose up -d postgres redis

# db
pnpm --filter @mela/api exec prisma migrate deploy
pnpm --filter @mela/api run db:seed

# run backend (API + workers in-process)
pnpm dev:api

# run shop app (after setting apps/shop-mobile/.env EXPO_PUBLIC_API_URL)
cd apps\shop-mobile; pnpm dev

# whole-repo checks
pnpm typecheck ; pnpm test ; pnpm build
```
