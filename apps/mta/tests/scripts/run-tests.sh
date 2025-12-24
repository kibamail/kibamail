#!/bin/bash
# =============================================================================
# Integration Test Runner
# =============================================================================
#
# This script runs the full integration test suite:
# 1. Sets up test environment (certs, policy files)
# 2. Starts control plane mock
# 3. Starts Docker containers
# 4. Runs Go integration tests
# 5. Cleans up
#
# Usage: ./scripts/run-tests.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    log_info "Cleaning up..."

    # Kill control plane mock if running
    if [ -n "${CONTROLPLANE_PID:-}" ]; then
        kill "$CONTROLPLANE_PID" 2>/dev/null || true
    fi

    # Stop Docker containers
    cd "$TEST_DIR"
    docker compose down 2>/dev/null || true
}

trap cleanup EXIT

# =============================================================================
# 1. Setup
# =============================================================================

log_info "=== MTA Integration Test Suite ==="
log_info "Test directory: $TEST_DIR"

cd "$TEST_DIR"

log_info "Running setup..."
./scripts/setup.sh

# =============================================================================
# 2. Start Docker Containers
# =============================================================================

log_info "Starting Docker containers..."
docker compose up -d

log_info "Waiting for containers to be healthy..."
sleep 10

# Wait for KumoMTA to be ready
max_attempts=30
attempt=0
until curl -sf http://localhost:8000/api/check-liveness/v1 > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        log_error "KumoMTA failed to become healthy"
        docker compose logs kumomta
        exit 1
    fi
    log_info "Waiting for KumoMTA... ($attempt/$max_attempts)"
    sleep 2
done

log_info "KumoMTA is healthy"

# =============================================================================
# 3. Start Control Plane Mock
# =============================================================================

log_info "Starting control plane mock..."
cd "$TEST_DIR"
go run ./cmd/controlplane &
CONTROLPLANE_PID=$!

sleep 2

# Verify control plane is running
if ! curl -sf http://localhost:3333/health > /dev/null 2>&1; then
    log_error "Control plane mock failed to start"
    exit 1
fi

log_info "Control plane mock is running (PID: $CONTROLPLANE_PID)"

# =============================================================================
# 4. Run Integration Tests
# =============================================================================

log_info "Running integration tests..."

cd "$TEST_DIR"
INTEGRATION_TEST=1 go test -v ./integration/... -timeout 5m

TEST_EXIT_CODE=$?

# =============================================================================
# 5. Results
# =============================================================================

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_info "=== ALL TESTS PASSED ==="
else
    log_error "=== TESTS FAILED ==="
fi

exit $TEST_EXIT_CODE
