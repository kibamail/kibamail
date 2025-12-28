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
COPY apps/web/package.json ./apps/web/
COPY apps/broadcast-editor/package.json ./apps/broadcast-editor/
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
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/broadcast-editor/node_modules ./apps/broadcast-editor/node_modules
COPY --from=deps /app/packages/owly/node_modules ./packages/owly/node_modules
COPY --from=deps /app/packages/tracking-utils/node_modules ./packages/tracking-utils/node_modules

# Copy source code
COPY . .

# Generate Prisma client (dummy URL for build-time generation only)
RUN cd apps/web && DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm exec prisma generate

# Build shared packages first (skip storybook for owly - not needed in production)
RUN pnpm --filter @repo/tracking-utils build
RUN cd packages/owly && pnpm build:clean && pnpm build:css && pnpm build:components
RUN pnpm --filter @repo/broadcast-editor build

# Build the web application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

RUN pnpm --filter web build

# ============================================
# Stage 4: CLI runner (for migrations, rbac:sync, etc.)
# ============================================
FROM base AS cli

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code (needed for scripts, prisma, config)
COPY apps/web ./apps/web
COPY packages ./packages

# Generate Prisma client
RUN cd apps/web && DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm exec prisma generate

WORKDIR /app/apps/web

# Skip env validation for CLI commands (only required env vars will be used)
ENV SKIP_ENV_VALIDATION=true

# Default command shows available commands
CMD ["sh", "-c", "echo 'Available commands:' && echo '  prisma migrate deploy' && echo '  tsx scripts/rbac-sync.ts' && echo '  tsx scripts/rbac-sync.ts --dry-run'"]

# ============================================
# Stage 5: Production runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set runtime environment defaults (can be overridden with -e flag)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Note: HOSTNAME is intentionally not set here to avoid redirect issues.
# Next.js will bind to 0.0.0.0 by default in standalone mode.

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma client and schema for runtime (from hoisted node_modules in pnpm workspace)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Start the Next.js server
CMD ["node", "apps/web/server.js"]
