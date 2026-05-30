# Build context = repo root (see docker-compose.yml). Monorepo-aware build.
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Turbo builds @mela/admin-web and its workspace deps (types, api-client, ui-web).
RUN pnpm exec turbo run build --filter=@mela/admin-web

FROM nginx:alpine AS runner
COPY --from=build /app/apps/admin-web/dist /usr/share/nginx/html
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
