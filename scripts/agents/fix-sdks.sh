#!/usr/bin/env bash

# SDK Fix Runner
# Runs Claude fix agents to implement fixes from audit reports
#
# Usage:
#   ./scripts/agents/fix-sdks.sh [options]
#
# Options:
#   --sdk <name>      Run fix for a specific SDK only (go, nodejs, php)
#   --report <path>   Use a specific audit report (required for single SDK)
#   --latest          Use the latest audit report for each SDK
#   --parallel        Run all fixes in parallel (default: sequential)
#   --help            Show this help message

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the repo root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Available SDKs
SDKS=("go" "nodejs" "php")

# Default options
PARALLEL=false
SPECIFIC_SDK=""
SPECIFIC_REPORT=""
USE_LATEST=false

# Arrays to track SDKs and their reports (parallel arrays instead of associative)
SDKS_TO_RUN=()
REPORTS=()

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

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Show help
show_help() {
    cat << EOF
SDK Fix Runner - Implements fixes from Claude audit reports

Usage:
    ./scripts/agents/fix-sdks.sh [options]

Options:
    --sdk <name>      Run fix for a specific SDK only
                      Valid values: go, nodejs, php

    --report <path>   Use a specific audit report file
                      Required when using --sdk without --latest

    --latest          Automatically use the most recent audit report
                      for each SDK

    --parallel        Run all fixes in parallel (default: sequential)

    --help            Show this help message

Examples:
    # Fix a specific SDK with a specific report
    ./scripts/agents/fix-sdks.sh --sdk nodejs --report .audits/nodejs-sdk/2025-11-30T17-33-50-abc.json

    # Fix a specific SDK using its latest audit report
    ./scripts/agents/fix-sdks.sh --sdk nodejs --latest

    # Fix all SDKs using their latest audit reports
    ./scripts/agents/fix-sdks.sh --latest

    # Fix all SDKs in parallel using latest reports
    ./scripts/agents/fix-sdks.sh --latest --parallel

Output:
    Fix reports are saved to:
    .audits/<sdk-name>/fixes/<timestamp>-<audit-id>-fixes.json
EOF
}

# Get the latest audit report for an SDK
get_latest_report() {
    local sdk=$1
    local audit_dir="$REPO_ROOT/.audits/${sdk}-sdk"

    if [ ! -d "$audit_dir" ]; then
        echo ""
        return
    fi

    # Find the most recent JSON file (excluding the fixes subdirectory)
    local latest=$(find "$audit_dir" -maxdepth 1 -name "*.json" -type f 2>/dev/null | sort -r | head -1)
    echo "$latest"
}

# List available audit reports for an SDK
list_reports() {
    local sdk=$1
    local audit_dir="$REPO_ROOT/.audits/${sdk}-sdk"

    if [ ! -d "$audit_dir" ]; then
        print_warning "No audit directory found for ${sdk} SDK"
        return
    fi

    local reports=$(find "$audit_dir" -maxdepth 1 -name "*.json" -type f 2>/dev/null | sort -r)

    if [ -z "$reports" ]; then
        print_warning "No audit reports found for ${sdk} SDK"
        return
    fi

    echo "Available audit reports for ${sdk} SDK:"
    echo "$reports" | while read -r report; do
        local basename=$(basename "$report")
        echo "  - $basename"
    done
}

# Get report for SDK by index
get_report_for_sdk() {
    local sdk=$1
    local i=0
    for s in "${SDKS_TO_RUN[@]}"; do
        if [ "$s" = "$sdk" ]; then
            echo "${REPORTS[$i]}"
            return
        fi
        ((i++))
    done
    echo ""
}

# Run fix for a single SDK
run_sdk_fix() {
    local sdk=$1
    local report_path=$2
    local command="/fix-${sdk}-sdk"

    if [ -z "$report_path" ]; then
        print_error "No audit report specified for ${sdk} SDK"
        list_reports "$sdk"
        return 1
    fi

    if [ ! -f "$report_path" ]; then
        print_error "Audit report not found: $report_path"
        return 1
    fi

    # Get relative path from repo root
    local relative_path="${report_path#$REPO_ROOT/}"

    print_info "Starting fix for ${sdk} SDK"
    print_info "Using report: ${relative_path}"

    # Change to repo root for Claude to find files correctly
    cd "$REPO_ROOT"

    # Ensure fixes directory exists
    mkdir -p "$REPO_ROOT/.audits/${sdk}-sdk/fixes"
    chmod 755 "$REPO_ROOT/.audits/${sdk}-sdk/fixes"

    local exit_code=0

    # Run Claude with streaming output
    if command -v unbuffer &> /dev/null; then
        unbuffer claude -p --dangerously-skip-permissions "${command} ${relative_path}" || exit_code=$?
    elif command -v stdbuf &> /dev/null; then
        stdbuf -oL -eL claude -p --dangerously-skip-permissions "${command} ${relative_path}" || exit_code=$?
    else
        if [[ "$OSTYPE" == "darwin"* ]]; then
            script -q /dev/null claude -p --dangerously-skip-permissions "${command} ${relative_path}" || exit_code=$?
        else
            claude -p --dangerously-skip-permissions "${command} ${relative_path}" || exit_code=$?
        fi
    fi

    if [ $exit_code -eq 0 ]; then
        print_success "Completed fixes for ${sdk} SDK"
        return 0
    else
        print_error "Failed to complete fixes for ${sdk} SDK"
        return 1
    fi
}

# Run fixes sequentially
run_sequential() {
    local failed=()
    local succeeded=()
    local i=0

    for sdk in "${SDKS_TO_RUN[@]}"; do
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_header "Fixing ${sdk} SDK"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        local report="${REPORTS[$i]}"
        if run_sdk_fix "$sdk" "$report"; then
            succeeded+=("$sdk")
        else
            failed+=("$sdk")
        fi
        ((i++))
    done

    # Print summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "FIX SUMMARY"
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

# Run fixes in parallel
run_parallel() {
    local pids=()
    local sdk_pids=()
    local log_dir="$REPO_ROOT/.audits/logs/fixes"

    mkdir -p "$log_dir"
    chmod 755 "$log_dir"

    print_info "Starting parallel fixes for: ${SDKS_TO_RUN[*]}"
    print_info "Live logs available at: .audits/logs/fixes/"
    echo ""

    local i=0
    for sdk in "${SDKS_TO_RUN[@]}"; do
        local report="${REPORTS[$i]}"
        local log_file="$log_dir/${sdk}-fix.log"

        print_info "[$sdk] Starting... (log: .audits/logs/fixes/${sdk}-fix.log)"

        (run_sdk_fix "$sdk" "$report" 2>&1 | tee "$log_file") &
        pids+=($!)
        sdk_pids+=("$sdk:$!")
        ((i++))
    done

    echo ""
    print_info "All fixes running in parallel. Streaming combined output..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Tail all log files
    (
        sleep 1
        tail -f "$log_dir"/*.log 2>/dev/null &
        local tail_pid=$!

        for pid in "${pids[@]}"; do
            wait "$pid" 2>/dev/null
        done

        kill $tail_pid 2>/dev/null
    ) &
    local monitor_pid=$!

    # Collect results
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

    wait $monitor_pid 2>/dev/null

    # Print summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PARALLEL FIX SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ ${#succeeded[@]} -gt 0 ]; then
        print_success "Completed: ${succeeded[*]}"
    fi

    if [ ${#failed[@]} -gt 0 ]; then
        print_error "Failed: ${failed[*]}"
        echo ""
        print_info "Check individual logs at .audits/logs/fixes/ for details"
        return 1
    fi

    echo ""
    print_info "Full logs available at: .audits/logs/fixes/"

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
            --report)
                if [ -z "${2:-}" ]; then
                    print_error "--report requires a path to an audit report"
                    exit 1
                fi
                SPECIFIC_REPORT="$2"
                shift 2
                ;;
            --latest)
                USE_LATEST=true
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
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
    if ! command -v claude &> /dev/null; then
        print_error "Claude CLI is not installed or not in PATH"
        exit 1
    fi

    if [ ! -d "$REPO_ROOT/.claude/commands" ]; then
        print_error "Claude commands directory not found"
        exit 1
    fi

    # Check for fix commands
    for sdk in "${SDKS[@]}"; do
        if [ ! -f "$REPO_ROOT/.claude/commands/fix-${sdk}-sdk.md" ]; then
            print_warning "Fix command not found for ${sdk} SDK"
        fi
    done
}

# Main entry point
main() {
    parse_args "$@"

    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           Kibamail SDK Fix Runner                        ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites

    # Determine which SDKs to fix and their reports
    if [ -n "$SPECIFIC_SDK" ]; then
        SDKS_TO_RUN=("$SPECIFIC_SDK")

        if [ -n "$SPECIFIC_REPORT" ]; then
            # Use the specified report
            if [[ "$SPECIFIC_REPORT" != /* ]]; then
                SPECIFIC_REPORT="$REPO_ROOT/$SPECIFIC_REPORT"
            fi
            REPORTS=("$SPECIFIC_REPORT")
        elif [ "$USE_LATEST" = true ]; then
            # Get the latest report
            local latest=$(get_latest_report "$SPECIFIC_SDK")
            if [ -z "$latest" ]; then
                print_error "No audit reports found for ${SPECIFIC_SDK} SDK"
                print_info "Run an audit first: ./scripts/agents/audit-sdks.sh --sdk ${SPECIFIC_SDK}"
                exit 1
            fi
            REPORTS=("$latest")
        else
            print_error "Must specify --report <path> or --latest when using --sdk"
            exit 1
        fi
    else
        if [ "$USE_LATEST" != true ]; then
            print_error "Must specify --latest when fixing all SDKs, or use --sdk with --report"
            exit 1
        fi

        # Get latest reports for all SDKs
        for sdk in "${SDKS[@]}"; do
            local latest=$(get_latest_report "$sdk")
            if [ -n "$latest" ]; then
                SDKS_TO_RUN+=("$sdk")
                REPORTS+=("$latest")
            else
                print_warning "No audit report found for ${sdk} SDK, skipping"
            fi
        done

        if [ ${#SDKS_TO_RUN[@]} -eq 0 ]; then
            print_error "No audit reports found for any SDK"
            print_info "Run audits first: ./scripts/agents/audit-sdks.sh"
            exit 1
        fi
    fi

    # Display what we're going to do
    print_info "SDKs to fix: ${SDKS_TO_RUN[*]}"
    print_info "Mode: $([ "$PARALLEL" = true ] && echo "parallel" || echo "sequential")"
    echo ""
    echo "Reports to use:"
    local i=0
    for sdk in "${SDKS_TO_RUN[@]}"; do
        local report="${REPORTS[$i]}"
        local relative="${report#$REPO_ROOT/}"
        echo "  ${sdk}: ${relative}"
        ((i++))
    done

    echo ""

    # Run fixes
    if [ "$PARALLEL" = true ]; then
        run_parallel
    else
        run_sequential
    fi
}

main "$@"
