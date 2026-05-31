# Mela — Implementation Plan: Phase 2 (Shop-owner App)

> The money-maker: a native iOS/Android app (Expo React Native) for kiosk owners.
> Reuses `@mela/types` + `@mela/api-client` against the Phase 1 backend.
> Companion to [MASTER_PLAN.md](MASTER_PLAN.md).

## Goals
A shop owner can: register (phone+OTP) → browse the catalog in Amharic **even on
flaky/no signal** → build a cart → place an order (queued offline, synced on
reconnect) → pay (wallet or Chapa) → track delivery live on a map → manage credit
→ get push + SMS updates.

## Tech decisions
| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (managed) + expo-router** | OTA updates, file-based routing, fast iteration; Android-first |
| Language | TypeScript, shares `@mela/types` + `@mela/api-client` | one contract with the API |
| Server state | **TanStack Query** + `persistQueryClient` (MMKV) | offline cache of catalog/orders |
| Client state | Zustand (cart, auth) persisted to MMKV | survives restarts |
| Secure tokens | `expo-secure-store` | tokens never in plain storage |
| Offline writes | **mutation queue** (persisted) + optimistic UI | orders survive no-signal, sync on reconnect |
| i18n | `i18next` + `react-i18next` | Amharic + English now; Oromo/Tigrinya later |
| Maps | `react-native-maps` | live delivery tracking |
| Realtime | `socket.io-client` (join `batch:`/`order:` rooms) | driver location + ETA |
| Payments | `expo-web-browser` for Chapa checkout + status poll; wallet in-app | matches Phase 1 payment API |
| Push | `expo-notifications` → Expo Push (FCM) | delivery + payment alerts |

## Monorepo integration
- New app at `apps/shop-mobile` (Expo). Wire into `pnpm-workspace.yaml` + Turbo.
- **Metro monorepo config** (`watchFolders` = repo root, `nodeModulesPaths`) so it
  resolves the workspace `@mela/*` packages.
- Turbo `dev` task is persistent (`expo start`); `build` via EAS later (not in CI).

## Backend additions this phase needs (small)
- **DeviceToken** model + `POST /api/v1/devices` (register Expo push token) and a
  push-send path in the notification worker (Expo Push API) alongside SMS.
- (Optional, if loyalty is in scope) minimal **LoyaltyAccount/PointsLedger** — else
  defer; not required for the core flow.

## Waves
**2A — Scaffold & foundation**
Expo app + expo-router + Metro monorepo config; consume `@mela/types`/`@mela/api-client`;
theme (brand orange/dark) + base UI components; auth store (Zustand + SecureStore);
api-client wired to SecureStore tokens; i18n (am/en); tab + auth navigation shell.

**2B — Auth & onboarding**
Phone register (zone picker) → OTP screen → token storage → session bootstrap;
logout; guarded routes.

**2C — Catalog, cart & offline ordering** *(the core)*
Catalog (categories, search, Amharic names, images) cached offline; product detail;
cart (persisted) with min-qty + payment method; **place order via offline mutation
queue + optimistic UI**, auto-sync on reconnect; reorder / buy-again.

**2D — Orders & live tracking**
Orders list + detail with status timeline; **live tracking map** (react-native-maps)
with driver marker via socket + ETA; pull-to-refresh.

**2E — Wallet, payments & credit**
Wallet balance + ledger; top-up via Chapa (web-browser + status poll); pay order
from wallet; credit score screen (gamified: how to raise it), apply/repay loan.

**2F — Profile, i18n, push & polish**
Profile (edit shop, language switch); **push notifications** (register device token,
handle delivery/payment alerts); empty/loading/error states; offline banner;
performance pass for low-end Android.

## Done when
A real shop owner can install the app, register, order offline, pay, and watch the
delivery on a map — against the Phase 1 backend (with provider stubs in dev).

## Suggested first build
**2A + 2B + 2C** as the first reviewable slice (you can place an order end-to-end),
then 2D/2E/2F. Each wave: typecheck green, commit, check in.

## Open decisions (asked before building)
- Confirm **Expo managed + expo-router** (vs React Navigation / bare RN).
- **Offline depth**: full offline-first (recommended) vs online-first.
- **Push notifications**: include now (adds the DeviceToken backend bit) vs defer.
- **Loyalty/points**: in scope this phase vs defer.
