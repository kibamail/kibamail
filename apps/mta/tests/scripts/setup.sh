#!/bin/bash
# =============================================================================
# Integration Test Setup Script
# =============================================================================
#
# This script prepares the test environment:
# 1. Generates TLS certificates (if not present)
# 2. Generates MTA DKIM keys (if not present)
#
# Policy files are mounted directly from:
#   - mta/policy/          (shared: init.lua, dkim_data.toml, tsa_init.lua)
#   - mta/test/policy/     (env-specific: sources.toml)
#
# Usage: ./scripts/setup.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MTA_DIR="$(cd "$TEST_DIR/.." && pwd)"

echo "=== Setting up MTA Integration Test Environment ==="
echo "Test directory: $TEST_DIR"
echo "MTA directory: $MTA_DIR"

# =============================================================================
# 1. Generate TLS Certificates
# =============================================================================

echo ""
echo ">>> Checking TLS certificates..."

if [ ! -f "$TEST_DIR/certs/fullchain.pem" ]; then
    echo "    Generating certificates..."
    cd "$TEST_DIR/certs"
    ./generate-certs.sh
    cd "$TEST_DIR"
else
    echo "    Certificates already exist, skipping generation"
fi

# =============================================================================
# 2. Create MTA DKIM Key Directory Structure
# =============================================================================

echo ""
echo ">>> Setting up MTA DKIM key..."

mkdir -p "$TEST_DIR/certs/dkim/kbmta.net"

# Generate MTA DKIM key if not exists
if [ ! -f "$TEST_DIR/certs/dkim/kbmta.net/kbmta.key" ]; then
    echo "    Generating MTA DKIM key..."
    openssl genrsa -out "$TEST_DIR/certs/dkim/kbmta.net/kbmta.key" 1024 2>/dev/null
    openssl rsa -in "$TEST_DIR/certs/dkim/kbmta.net/kbmta.key" -pubout \
        -out "$TEST_DIR/certs/dkim/kbmta.net/kbmta.pub" 2>/dev/null
    chmod 600 "$TEST_DIR/certs/dkim/kbmta.net/kbmta.key"
    echo "    Generated: MTA DKIM key pair"
else
    echo "    MTA DKIM key already exists"
fi

# =============================================================================
# 3. Verify Policy Files Exist
# =============================================================================

echo ""
echo ">>> Verifying policy files..."

REQUIRED_FILES=(
    "$MTA_DIR/policy/init.lua"
    "$MTA_DIR/policy/dkim_data.toml"
    "$MTA_DIR/test/policy/sources.toml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "    ✓ $(basename "$file")"
    else
        echo "    ✗ Missing: $file"
        exit 1
    fi
done

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Directory structure:"
echo "  mta/policy/           - Shared policy files (init.lua, dkim_data.toml)"
echo "  mta/test/policy/      - Test sources.toml"
echo "  mta/tests/certs/      - TLS certificates and DKIM keys"
echo ""
echo "Certificates:"
ls -la "$TEST_DIR/certs/"*.pem 2>/dev/null | head -5 || echo "  (none yet - run generate-certs.sh)"
echo ""
echo "Next steps:"
echo "  1. Start control plane mock: go run ./cmd/controlplane"
echo "  2. Start Docker containers:  docker compose up -d"
echo "  3. Run tests:                INTEGRATION_TEST=1 go test -v ./integration/..."
echo ""
