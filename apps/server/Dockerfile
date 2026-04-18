# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build shared first (server depends on its types)
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @safety-board/shared build

# Build server
COPY apps/server/ ./apps/server/
RUN pnpm --filter @safety-board/server build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 3001

CMD ["node", "apps/server/dist/index.js"]
