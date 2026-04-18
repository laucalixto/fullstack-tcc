# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/client/package.json ./apps/client/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @safety-board/shared build

COPY apps/client/ ./apps/client/

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

RUN pnpm --filter @safety-board/client build

# ── Runtime stage (nginx) ─────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# SPA fallback: todas as rotas retornam index.html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
