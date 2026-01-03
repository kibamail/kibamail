# ============================================
# Tracking Service Dockerfile - Production Build
# ============================================
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# Install dependencies
# ============================================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/tracking/package.json ./apps/tracking/
COPY packages/tracking-utils/package.json ./packages/tracking-utils/

RUN pnpm install --frozen-lockfile

# ============================================
# Build tracking service
# ============================================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/tracking/node_modules ./apps/tracking/node_modules
COPY --from=deps /app/packages/tracking-utils/node_modules ./packages/tracking-utils/node_modules

COPY apps/tracking ./apps/tracking
COPY packages/tracking-utils ./packages/tracking-utils
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build tracking-utils first (dependency)
RUN pnpm --filter @repo/tracking-utils build

# Build tracking service
RUN pnpm --filter @repo/tracking build

# Deploy with pnpm (creates pruned production install)
RUN pnpm --filter @repo/tracking deploy --prod /app/deploy

# ============================================
# Production runner
# ============================================
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 tracking

# Copy deployed app with production dependencies
COPY --from=builder --chown=tracking:nodejs /app/deploy ./

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

USER tracking

CMD ["node", "dist/server.js"]
