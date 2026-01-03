# =============================================================================
# Email Agent Dockerfile
# =============================================================================
#
# Multi-stage build for the Email Agent Go service
#
# =============================================================================

# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /email-agent ./cmd/email-agent

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates wget

# Copy binary from builder
COPY --from=builder /email-agent /app/email-agent

# Create non-root user
RUN adduser -D -u 1000 agent
USER agent

EXPOSE 8080

ENTRYPOINT ["/app/email-agent"]
