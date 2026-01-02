#!/bin/bash
# =============================================================================
# KumoMTA Integration Test Runner
# =============================================================================
#
# This script sets up, runs, and tears down the integration test environment.
#
# Usage:
#   ./run-tests.sh              # Run all tests
#   ./run-tests.sh --keep       # Run tests but keep environment running
#   ./run-tests.sh --setup      # Setup only, don't run tests
#   ./run-tests.sh --teardown   # Teardown only
#   ./run-tests.sh --test-only  # Run tests only (assumes setup is done)
#   ./run-tests.sh TestBounce   # Run specific test pattern
#
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
CONTROL_PLANE_PORT=3334
CONTROL_PLANE_PID_FILE="/tmp/controlplane-mock.pid"
CONTROL_PLANE_LOG="/tmp/controlplane.log"
MAX_WAIT_SECONDS=120
TEST_PATTERN="${1:-}"

# Parse arguments
KEEP_RUNNING=false
SETUP_ONLY=false
TEARDOWN_ONLY=false
TEST_ONLY=false

for arg in "$@"; do
    case $arg in
        --keep)
            KEEP_RUNNING=true
            TEST_PATTERN=""
            ;;
        --setup)
            SETUP_ONLY=true
            TEST_PATTERN=""
            ;;
        --teardown)
            TEARDOWN_ONLY=true
            TEST_PATTERN=""
            ;;
        --test-only)
            TEST_ONLY=true
            TEST_PATTERN=""
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS] [TEST_PATTERN]"
            echo ""
            echo "Options:"
            echo "  --keep       Keep environment running after tests"
            echo "  --setup      Setup environment only, don't run tests"
            echo "  --teardown   Teardown environment only"
            echo "  --test-only  Run tests only (assumes setup is done)"
            echo "  --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run all tests, then teardown"
            echo "  $0 --keep             # Run all tests, keep running"
            echo "  $0 TestBounce         # Run tests matching 'TestBounce'"
            echo "  $0 --keep TestDMARC   # Run DMARC tests, keep running"
            exit 0
            ;;
        --*)
            ;;
        *)
            if [[ -z "$TEST_PATTERN" || "$TEST_PATTERN" == --* ]]; then
                TEST_PATTERN="$arg"
            fi
            ;;
    esac
done

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if a port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Wait for a port to be available
wait_for_port() {
    local port=$1
    local name=$2
    local max_wait=${3:-$MAX_WAIT_SECONDS}
    local waited=0

    while ! port_in_use "$port"; do
        if [[ $waited -ge $max_wait ]]; then
            log_error "$name not available on port $port after ${max_wait}s"
            return 1
        fi
        sleep 1
        waited=$((waited + 1))
    done
    log_success "$name available on port $port"
}

# Wait for HTTP endpoint to be healthy
wait_for_http() {
    local url=$1
    local name=$2
    local max_wait=${3:-$MAX_WAIT_SECONDS}
    local waited=0

    while ! curl -sf "$url" >/dev/null 2>&1; do
        if [[ $waited -ge $max_wait ]]; then
            log_error "$name not healthy at $url after ${max_wait}s"
            return 1
        fi
        sleep 2
        waited=$((waited + 2))
        if [[ $((waited % 10)) -eq 0 ]]; then
            log_info "Waiting for $name... (${waited}s)"
        fi
    done
    log_success "$name healthy at $url"
}

# Wait for all Docker services to be healthy
wait_for_docker_services() {
    local max_wait=${1:-$MAX_WAIT_SECONDS}
    local waited=0

    log_info "Waiting for Docker services to be healthy..."

    while true; do
        local unhealthy
        unhealthy=$(docker compose ps --format json 2>/dev/null | jq -r 'select(.Health != "healthy" and .Health != "" and .State == "running") | .Name' | grep -v setup || true)

        if [[ -z "$unhealthy" ]]; then
            break
        fi

        if [[ $waited -ge $max_wait ]]; then
            log_error "Services not healthy after ${max_wait}s: $unhealthy"
            docker compose ps
            return 1
        fi

        sleep 2
        waited=$((waited + 2))
        if [[ $((waited % 10)) -eq 0 ]]; then
            log_info "Waiting for services... (${waited}s) - unhealthy: $unhealthy"
        fi
    done

    log_success "All Docker services healthy"
}

# =============================================================================
# Setup Functions
# =============================================================================

generate_certs() {
    log_section "Generating Certificates"

    if [[ -f "./certs/fullchain.pem" && -f "./certs/tenant-hq-dkim-private.pem" ]]; then
        log_success "Certificates already exist"
        return 0
    fi

    # Try the certs directory first (primary location)
    if [[ -x "./certs/generate-certs.sh" ]]; then
        log_info "Running certificate generation script..."
        (cd ./certs && ./generate-certs.sh)
        log_success "Certificates generated"
    # Fallback to scripts directory
    elif [[ -x "./scripts/setup.sh" ]]; then
        log_info "Running setup script..."
        ./scripts/setup.sh
        log_success "Setup complete"
    else
        log_warn "Certificate generation script not found, checking for existing certs..."
        if [[ ! -f "./certs/fullchain.pem" ]]; then
            log_error "No certificates found. Please create ./certs/generate-certs.sh or manually create certificates."
            return 1
        fi
    fi
}

start_docker_services() {
    log_section "Starting Docker Services"

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        return 1
    fi

    # Stop any existing services (clean state)
    log_info "Stopping any existing services..."
    docker compose down --remove-orphans 2>/dev/null || true

    # Start services
    log_info "Starting Docker Compose services..."
    docker compose up -d --build --remove-orphans

    # Wait for services to be healthy
    wait_for_docker_services

    # Show running services
    log_info "Running services:"
    docker compose ps
}

start_control_plane_mock() {
    log_section "Starting Control Plane Mock"

    # Check if already running
    if [[ -f "$CONTROL_PLANE_PID_FILE" ]]; then
        local pid
        pid=$(cat "$CONTROL_PLANE_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_success "Control plane mock already running (PID: $pid)"
            return 0
        else
            rm -f "$CONTROL_PLANE_PID_FILE"
        fi
    fi

    # Check if port is already in use
    if port_in_use $CONTROL_PLANE_PORT; then
        log_warn "Port $CONTROL_PLANE_PORT already in use, checking if it's our mock..."
        if curl -sf "http://localhost:$CONTROL_PLANE_PORT/health" | grep -q "control-plane-mock"; then
            log_success "Control plane mock already running on port $CONTROL_PLANE_PORT"
            return 0
        else
            log_error "Port $CONTROL_PLANE_PORT in use by another process"
            return 1
        fi
    fi

    # Build and start the mock
    log_info "Building control plane mock..."
    go build -o /tmp/controlplane-mock ./mocks/controlplane

    log_info "Starting control plane mock on port $CONTROL_PLANE_PORT..."
    PORT=$CONTROL_PLANE_PORT /tmp/controlplane-mock > "$CONTROL_PLANE_LOG" 2>&1 &
    local pid=$!
    echo "$pid" > "$CONTROL_PLANE_PID_FILE"

    # Wait for it to be ready
    sleep 2
    if ! kill -0 "$pid" 2>/dev/null; then
        log_error "Control plane mock failed to start. Log:"
        cat "$CONTROL_PLANE_LOG"
        return 1
    fi

    wait_for_http "http://localhost:$CONTROL_PLANE_PORT/health" "Control plane mock" 30
    log_success "Control plane mock started (PID: $pid)"
}

verify_setup() {
    log_section "Verifying Setup"

    local failed=false

    # Check Docker services
    log_info "Checking Docker services..."
    local services=("kbmta-mta" "kbmta-email-agent" "kbmta-nats" "kbmta-minio" "kbmta-redis" "kbmta-smtp-server")
    for svc in "${services[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${svc}$"; then
            log_success "  $svc running"
        else
            log_error "  $svc not running"
            failed=true
        fi
    done

    # Check endpoints
    log_info "Checking endpoints..."

    if curl -sf "http://localhost:8000/api/check-liveness/v1" >/dev/null; then
        log_success "  KumoMTA HTTP API (port 8000)"
    else
        log_error "  KumoMTA HTTP API not responding"
        failed=true
    fi

    if curl -sf "http://localhost:8080/health" >/dev/null; then
        log_success "  Email Agent (port 8080)"
    else
        log_error "  Email Agent not responding"
        failed=true
    fi

    if curl -sf "http://localhost:8025/api/v1/info" >/dev/null; then
        log_success "  SMTP Server API (port 8025)"
    else
        log_error "  SMTP Server API not responding"
        failed=true
    fi

    if curl -sf "http://localhost:$CONTROL_PLANE_PORT/health" >/dev/null; then
        log_success "  Control Plane Mock (port $CONTROL_PLANE_PORT)"
    else
        log_error "  Control Plane Mock not responding"
        failed=true
    fi

    if curl -sf "http://localhost:19000/minio/health/live" >/dev/null; then
        log_success "  MinIO S3 (port 19000)"
    else
        log_error "  MinIO not responding"
        failed=true
    fi

    if nc -z localhost 14222 2>/dev/null; then
        log_success "  NATS (port 14222)"
    else
        log_error "  NATS not responding"
        failed=true
    fi

    if [[ "$failed" == "true" ]]; then
        return 1
    fi

    log_success "All services verified"
}

# =============================================================================
# Test Functions
# =============================================================================

run_tests() {
    log_section "Running Integration Tests"

    local test_args=("-v" "./integration/...")

    if [[ -n "$TEST_PATTERN" ]]; then
        log_info "Running tests matching: $TEST_PATTERN"
        test_args+=("-run" "$TEST_PATTERN")
    else
        log_info "Running all integration tests"
    fi

    # Run tests
    set +e
    INTEGRATION_TEST=1 go test "${test_args[@]}"
    local exit_code=$?
    set -e

    if [[ $exit_code -eq 0 ]]; then
        log_success "All tests passed!"
    else
        log_error "Some tests failed (exit code: $exit_code)"
    fi

    return $exit_code
}

# =============================================================================
# Teardown Functions
# =============================================================================

stop_control_plane_mock() {
    log_info "Stopping control plane mock..."

    if [[ -f "$CONTROL_PLANE_PID_FILE" ]]; then
        local pid
        pid=$(cat "$CONTROL_PLANE_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            sleep 1
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
            log_success "Control plane mock stopped"
        fi
        rm -f "$CONTROL_PLANE_PID_FILE"
    fi

    # Also kill any orphaned processes
    pkill -f "controlplane-mock" 2>/dev/null || true
}

stop_docker_services() {
    log_info "Stopping Docker services..."
    docker compose down --remove-orphans -v 2>/dev/null || true
    log_success "Docker services stopped"
}

teardown() {
    log_section "Tearing Down Environment"
    stop_control_plane_mock
    stop_docker_services
    log_success "Environment torn down"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    local start_time
    start_time=$(date +%s)

    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        KumoMTA Integration Test Runner                    ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Handle teardown-only mode
    if [[ "$TEARDOWN_ONLY" == "true" ]]; then
        teardown
        exit 0
    fi

    # Setup trap for cleanup (unless --keep is specified)
    if [[ "$KEEP_RUNNING" == "false" && "$SETUP_ONLY" == "false" ]]; then
        trap teardown EXIT
    fi

    # Setup phase (skip if test-only)
    if [[ "$TEST_ONLY" == "false" ]]; then
        generate_certs
        start_docker_services
        start_control_plane_mock
        verify_setup
    else
        log_info "Skipping setup (--test-only mode)"
        # Still verify the setup is working
        verify_setup || {
            log_error "Setup verification failed. Run without --test-only to setup first."
            exit 1
        }
    fi

    # Handle setup-only mode
    if [[ "$SETUP_ONLY" == "true" ]]; then
        log_section "Setup Complete"
        echo ""
        echo "Environment is ready. To run tests manually:"
        echo "  INTEGRATION_TEST=1 go test -v ./integration/..."
        echo ""
        echo "To run specific tests:"
        echo "  INTEGRATION_TEST=1 go test -v ./integration/... -run TestBounce"
        echo ""
        echo "To teardown:"
        echo "  $0 --teardown"
        echo ""
        # Remove trap so environment stays running
        trap - EXIT
        exit 0
    fi

    # Run tests
    local test_exit_code=0
    run_tests || test_exit_code=$?

    # Calculate duration
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_section "Summary"
    echo ""
    echo "Duration: ${duration}s"

    if [[ $test_exit_code -eq 0 ]]; then
        echo -e "Result: ${GREEN}PASSED${NC}"
    else
        echo -e "Result: ${RED}FAILED${NC}"
    fi

    if [[ "$KEEP_RUNNING" == "true" ]]; then
        echo ""
        echo "Environment kept running (--keep mode)"
        echo "To teardown later: $0 --teardown"
        # Remove trap so environment stays running
        trap - EXIT
    fi

    echo ""
    exit $test_exit_code
}

# Run main
main
