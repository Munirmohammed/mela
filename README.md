# Mela — the digital Merkato

B2B group-buying, delivery & embedded finance for Ethiopian kiosks (suks).
Mela aggregates demand from thousands of small shops by zone, buys in bulk at
Merkato, delivers next morning, and turns transaction history into micro-credit.

> **Plans:** [MASTER_PLAN.md](MASTER_PLAN.md) (vision + architecture) ·
> [PLAN_PHASE_0_1.md](PLAN_PHASE_0_1.md) (task-level plan for the current phases).

## Monorepo layout

```
mela/
├── apps/
│   ├── api/            # Express + Prisma + BullMQ backend (modular monolith)
│   └── admin-web/      # React + Vite admin/ops dashboard
│       # shop-mobile / driver-mobile (Expo RN) + supplier-web land in later phases
├── packages/
│   ├── types/          # @mela/types — shared domain types & enums (framework-free)
│   ├── api-client/     # @mela/api-client — shared, injectable HTTP client
│   ├── ui-web/         # @mela/ui-web — shared web design-system components
│   └── config/         # @mela/config — shared tsconfig / prettier presets
├── docker-compose.yml  # postgres · redis · api · worker · admin-web
├── turbo.json          # task pipeline
└── pnpm-workspace.yaml
```

The API and web apps both consume the shared packages — no duplicated types,
HTTP client, or UI primitives. The mobile apps (Phase 2/3) reuse `@mela/types`
and `@mela/api-client` directly.

## Prerequisites

- **Node** ≥ 20
- **pnpm** (this repo pins it via `packageManager`; `corepack enable` will provide it)
- **Docker** (for local Postgres + Redis)

## Quick start

```bash
# 1. Install everything (workspace-aware)
pnpm install

# 2. Start Postgres + Redis (and optionally the whole stack)
docker compose up -d postgres redis

# 3. Configure the API env
cp apps/api/.env.example apps/api/.env
#   then fill in JWT_SECRET / JWT_REFRESH_SECRET at minimum

# 4. Create the schema + seed data
pnpm --filter @mela/api db:migrate
pnpm --filter @mela/api db:seed

# 5. Run the API + admin web together (Turborepo)
pnpm dev
#   API     → http://localhost:3000
#   Admin   → http://localhost:5173  (proxies /api → :3000)
```

Run a single app: `pnpm dev:api` or `pnpm dev:web`.

## Common commands (run from the repo root)

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run API + admin-web in watch mode (builds shared packages first) |
| `pnpm build` | Build every package + app via Turbo |
| `pnpm typecheck` | Typecheck all projects |
| `pnpm test` | Run all Vitest suites |
| `pnpm lint` | Lint all projects |
| `pnpm format` | Prettier-write the repo |

API-specific: `pnpm --filter @mela/api <script>` (`db:migrate`, `db:seed`,
`db:studio`, `db:generate`, `dev:worker`, …).

## Full stack with Docker

```bash
cp apps/api/.env.example apps/api/.env   # fill secrets
docker compose up --build
#   Admin web → http://localhost:8080
#   API       → http://localhost:3000
```

In Docker the API runs with `RUN_WORKERS_IN_API=false`; a dedicated **worker**
container owns BullMQ queue consumption + the cron scheduler.

## Observability

Set `SENTRY_DSN` (API) and/or `VITE_SENTRY_DSN` (web) to enable error tracking.
Both no-op when unset, so local dev needs no DSN.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR: install →
prisma generate/validate → typecheck → lint → test → build.
