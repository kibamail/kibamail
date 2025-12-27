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
# Stage 4: Production server (nginx)
# ============================================
FROM nginx:alpine AS runner

# Remove default nginx config and copy custom configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY apps/marketing/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files from builder
COPY --from=builder /app/apps/marketing/out /usr/share/nginx/html

# Set proper permissions for non-root execution
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
