FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package.json ./
RUN npm install --omit=dev

# Copy application
COPY server.js ./

# Expose ports
EXPOSE 25 8025

# Health check (using 127.0.0.1 because localhost may not resolve in container)
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD wget -q -O - http://127.0.0.1:8025/api/v1/info || exit 1

CMD ["node", "server.js"]
