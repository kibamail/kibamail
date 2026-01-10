# ============================================
# Stage 1: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY apps/mta-sink/package.json apps/mta-sink/package.json
COPY apps/mta-sink/tsconfig.json apps/mta-sink/tsconfig.json

# Install dependencies
RUN cd apps/mta-sink && npm ci

# Copy source code
COPY apps/mta-sink/src apps/mta-sink/src

# Build
RUN cd apps/mta-sink && npm run build

# ============================================
# Stage 2: Production runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mta-sink

# Copy build output from builder
COPY --from=builder --chown=mta-sink:nodejs /app/mta-sink/dist ./dist
COPY --from=builder --chown=mta-sink:nodejs /app/mta-sink/node_modules ./node_modules

# Switch to non-root user
USER mta-sink

EXPOSE 8000

ENV PORT=8000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
