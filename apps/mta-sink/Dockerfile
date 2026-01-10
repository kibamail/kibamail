# ============================================
# Stage 1: Builder
# ============================================
FROM node:22-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /build

# Copy mta-sink content
COPY apps/mta-sink/package.json apps/mta-sink/tsconfig.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY apps/mta-sink/src ./src

# Build
RUN pnpm run build

# ============================================
# Stage 2: Production runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mta-sink

# Copy build output from builder
COPY --from=builder --chown=mta-sink:nodejs /build/dist ./dist
COPY --from=builder --chown=mta-sink:nodejs /build/node_modules ./node_modules

# Switch to non-root user
USER mta-sink

EXPOSE 8000

ENV PORT=8000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
