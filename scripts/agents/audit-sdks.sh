#!/usr/bin/env bash

# SDK Audit Runner
# Runs Claude audit agents for all Kibamail SDKs
#
# Usage:
#   ./scripts/agents/audit-sdks.sh [options]
#
# Options:
#   --sdk <name>    Run audit for a specific SDK only (go, nodejs, php)
#   --parallel      Run all audits in parallel (default: sequential)
#   --id <id>       Use a custom audit ID prefix (default: auto-generated)
#   --help          Show this help message

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the repo root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Available SDKs
SDKS=("go" "nodejs" "php")

# Default options
PARALLEL=false
SPECIFIC_SDK=""
CUSTOM_ID_PREFIX=""

# Generate a unique audit ID
generate_audit_id() {
    local sdk=$1
    local prefix=${CUSTOM_ID_PREFIX:-"audit"}
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local random=$(openssl rand -hex 4)
    echo "${prefix}-${sdk}-${timestamp}-${random}"
}

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show help
show_help() {
    cat << EOF
SDK Audit Runner - Runs Claude audit agents for Kibamail SDKs

Usage:
    ./scripts/agents/audit-sdks.sh [options]

Options:
    --sdk <name>    Run audit for a specific SDK only
                    Valid values: go, nodejs, php

    --parallel      Run all audits in parallel (default: sequential)

    --id <prefix>   Use a custom audit ID prefix
                    Default: "audit"
                    Example: --id "release-v1.0"

    --help          Show this help message

Examples:
    # Audit all SDKs sequentially
    ./scripts/agents/audit-sdks.sh

    # Audit only the Go SDK
    ./scripts/agents/audit-sdks.sh --sdk go

    # Audit all SDKs in parallel with custom ID prefix
    ./scripts/agents/audit-sdks.sh --parallel --id "pre-release"

    # Audit PHP SDK with custom ID
    ./scripts/agents/audit-sdks.sh --sdk php --id "hotfix-123"

Output:
    Audit reports are saved to:
    .audits/<sdk-name>/<timestamp>-<audit-id>.json
EOF
}

# Run audit for a single SDK
run_sdk_audit() {
    local sdk=$1
    local audit_id=$(generate_audit_id "$sdk")
    local command="/audit-${sdk}-sdk"

    print_info "Starting audit for ${sdk} SDK with ID: ${audit_id}"

    # Change to repo root for Claude to find files correctly
    cd "$REPO_ROOT"

    # Run Claude with the audit command
    # --dangerously-skip-permissions: allows file write operations without prompts
    # -p: run in print mode (non-interactive)
    # Using script/unbuffer to force line-buffered output for real-time streaming
    local exit_code=0

    # Try to use unbuffer if available (from expect package), otherwise use stdbuf, otherwise run directly
    if command -v unbuffer &> /dev/null; then
        unbuffer claude -p --dangerously-skip-permissions "${command} ${audit_id}" || exit_code=$?
    elif command -v stdbuf &> /dev/null; then
        stdbuf -oL -eL claude -p --dangerously-skip-permissions "${command} ${audit_id}" || exit_code=$?
    else
        # Run directly with forced flushing via script command (available on macOS/Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS: use script to force pseudo-tty for unbuffered output
            script -q /dev/null claude -p --dangerously-skip-permissions "${command} ${audit_id}" || exit_code=$?
        else
            # Linux/other: run directly, output should stream
            claude -p --dangerously-skip-permissions "${command} ${audit_id}" || exit_code=$?
        fi
    fi

    if [ $exit_code -eq 0 ]; then
        print_success "Completed audit for ${sdk} SDK"
        echo "  Audit ID: ${audit_id}"
        return 0
    else
        print_error "Failed to complete audit for ${sdk} SDK"
        return 1
    fi
}

# Run audits sequentially
run_sequential() {
    local sdks_to_run=("$@")
    local failed=()
    local succeeded=()

    for sdk in "${sdks_to_run[@]}"; do
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        if run_sdk_audit "$sdk"; then
            succeeded+=("$sdk")
        else
            failed+=("$sdk")
        fi
    done

    # Print summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "AUDIT SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ ${#succeeded[@]} -gt 0 ]; then
        print_success "Completed: ${succeeded[*]}"
    fi

    if [ ${#failed[@]} -gt 0 ]; then
        print_error "Failed: ${failed[*]}"
        return 1
    fi

    return 0
}

# Run audits in parallel
run_parallel() {
    local sdks_to_run=("$@")
    local pids=()
    local sdk_pids=()
    local log_dir="$REPO_ROOT/.audits/logs"

    # Create log directory for parallel output
    mkdir -p "$log_dir"
    chmod 755 "$log_dir"

    print_info "Starting parallel audits for: ${sdks_to_run[*]}"
    print_info "Live logs available at: .audits/logs/"
    echo ""

    # Start all audits in background, each writing to its own log file
    for sdk in "${sdks_to_run[@]}"; do
        local log_file="$log_dir/${sdk}-audit.log"
        print_info "[$sdk] Starting... (log: .audits/logs/${sdk}-audit.log)"

        # Run in background, tee to log file for both capture and later review
        (run_sdk_audit "$sdk" 2>&1 | tee "$log_file") &
        pids+=($!)
        sdk_pids+=("$sdk:$!")
    done

    echo ""
    print_info "All audits running in parallel. Streaming combined output..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Tail all log files to show combined streaming output
    # This runs until all background jobs complete
    (
        sleep 1  # Give processes time to start writing
        tail -f "$log_dir"/*.log 2>/dev/null &
        local tail_pid=$!

        # Wait for all audit processes to complete
        for pid in "${pids[@]}"; do
            wait "$pid" 2>/dev/null
        done

        # Kill the tail process
        kill $tail_pid 2>/dev/null
    ) &
    local monitor_pid=$!

    # Wait for all to complete and collect results
    local failed=()
    local succeeded=()

    for entry in "${sdk_pids[@]}"; do
        local sdk="${entry%%:*}"
        local pid="${entry##*:}"

        if wait "$pid" 2>/dev/null; then
            succeeded+=("$sdk")
        else
            failed+=("$sdk")
        fi
    done

    # Wait for monitor to finish
    wait $monitor_pid 2>/dev/null

    # Print summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PARALLEL AUDIT SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ ${#succeeded[@]} -gt 0 ]; then
        print_success "Completed: ${succeeded[*]}"
    fi

    if [ ${#failed[@]} -gt 0 ]; then
        print_error "Failed: ${failed[*]}"
        echo ""
        print_info "Check individual logs at .audits/logs/ for details"
        return 1
    fi

    echo ""
    print_info "Full logs available at: .audits/logs/"

    return 0
}

# Validate SDK name
validate_sdk() {
    local sdk=$1
    for valid_sdk in "${SDKS[@]}"; do
        if [ "$sdk" = "$valid_sdk" ]; then
            return 0
        fi
    done
    return 1
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --sdk)
                if [ -z "${2:-}" ]; then
                    print_error "--sdk requires a value (go, nodejs, php)"
                    exit 1
                fi
                if ! validate_sdk "$2"; then
                    print_error "Invalid SDK: $2. Valid options: ${SDKS[*]}"
                    exit 1
                fi
                SPECIFIC_SDK="$2"
                shift 2
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --id)
                if [ -z "${2:-}" ]; then
                    print_error "--id requires a value"
                    exit 1
                fi
                CUSTOM_ID_PREFIX="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    # Check if claude CLI is available
    if ! command -v claude &> /dev/null; then
        print_error "Claude CLI is not installed or not in PATH"
        echo "Install it from: https://github.com/anthropics/claude-code"
        exit 1
    fi

    # Check if .claude/commands exist
    if [ ! -d "$REPO_ROOT/.claude/commands" ]; then
        print_error "Claude commands directory not found at .claude/commands"
        exit 1
    fi

    # Check if audit commands exist
    for sdk in "${SDKS[@]}"; do
        if [ ! -f "$REPO_ROOT/.claude/commands/audit-${sdk}-sdk.md" ]; then
            print_warning "Audit command not found for ${sdk} SDK"
        fi
    done

    # Ensure .audits directories exist with write permissions
    for sdk in "${SDKS[@]}"; do
        mkdir -p "$REPO_ROOT/.audits/${sdk}-sdk"
        chmod 755 "$REPO_ROOT/.audits/${sdk}-sdk"
    done

    # Ensure the parent .audits directory also has write permissions
    chmod 755 "$REPO_ROOT/.audits"
}

# Main entry point
main() {
    parse_args "$@"

    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           Kibamail SDK Audit Runner                      ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites

    # Determine which SDKs to audit
    local sdks_to_run=()
    if [ -n "$SPECIFIC_SDK" ]; then
        sdks_to_run=("$SPECIFIC_SDK")
    else
        sdks_to_run=("${SDKS[@]}")
    fi

    print_info "SDKs to audit: ${sdks_to_run[*]}"
    print_info "Mode: $([ "$PARALLEL" = true ] && echo "parallel" || echo "sequential")"
    [ -n "$CUSTOM_ID_PREFIX" ] && print_info "ID Prefix: $CUSTOM_ID_PREFIX"

    # Run audits
    if [ "$PARALLEL" = true ]; then
        run_parallel "${sdks_to_run[@]}"
    else
        run_sequential "${sdks_to_run[@]}"
    fi
}

main "$@"
