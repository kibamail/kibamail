#!/bin/bash
# Ensures test SDK infrastructure (Prism mock server) is running
# This script is idempotent - safe to run multiple times

set -e

CONTAINER_NAME="kibamail-test-sdk-prism"
COMPOSE_FILE="test-sdk-infra/docker-compose.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Check if container is already running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Test SDK infrastructure already running"
    exit 0
fi

# Check if container exists but is stopped
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "🔄 Starting existing test SDK infrastructure..."
    docker start "$CONTAINER_NAME"
else
    echo "🚀 Starting test SDK infrastructure..."
    docker compose -f "$COMPOSE_FILE" up -d
fi

# Wait for health check
echo "⏳ Waiting for Prism to be healthy..."
MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker inspect "$CONTAINER_NAME" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
        echo "✅ Test SDK infrastructure ready at http://localhost:4010"
        exit 0
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

echo "❌ Test SDK infrastructure failed to become healthy within ${MAX_WAIT}s"
echo "📋 Container logs:"
docker logs "$CONTAINER_NAME"
exit 1
