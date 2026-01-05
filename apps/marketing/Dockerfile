# ============================================
# Stage 1: Base image with pnpm
# ============================================
FROM node:22-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# Stage 2: Install dependencies
# ============================================
FROM base AS deps

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

# Copy all package.json files from the monorepo
COPY apps/marketing/package.json ./apps/marketing/
COPY packages/owly/package.json ./packages/owly/
COPY packages/tracking-utils/package.json ./packages/tracking-utils/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 3: Build the application
# ============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/marketing/node_modules ./apps/marketing/node_modules
COPY --from=deps /app/packages/owly/node_modules ./packages/owly/node_modules
COPY --from=deps /app/packages/tracking-utils/node_modules ./packages/tracking-utils/node_modules

# Copy source code
COPY . .

# Build shared packages first (skip storybook for owly - not needed in production)
RUN pnpm --filter @repo/tracking-utils build
RUN cd packages/owly && pnpm build:clean && pnpm build:css && pnpm build:components

# Build the marketing site (static export)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter marketing build

# ============================================
# Stage 4: Static files only (for init container use)
# ============================================
FROM alpine:latest AS runner

# Copy static files from builder
COPY --from=builder /app/apps/marketing/out /marketing-static

# Default command: copy files to a target directory
# Usage: the init container will copy from /marketing-static to a shared volume
CMD ["sh", "-c", "cp -r /marketing-static/* ${TARGET_DIR:-/target}"]
