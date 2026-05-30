# Build context = repo root (see docker-compose.yml). Monorepo-aware build.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
# Copy the whole workspace so pnpm can resolve every project + the lockfile.
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mela/api exec prisma generate
# Turbo builds @mela/api and its workspace dependencies in order.
RUN pnpm exec turbo run build --filter=@mela/api

FROM base AS runner
ENV NODE_ENV=production
ENV RUN_WORKERS_IN_API=false
# Bring the fully-installed, built workspace over.
COPY --from=build /app /app
RUN mkdir -p /app/apps/api/logs
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/server.js"]
