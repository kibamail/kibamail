#!/bin/bash
# =============================================================================
# KumoMTA + TSA Daemon Startup Script
# =============================================================================
#
# This script starts both the TSA daemon and KumoMTA in the same container.
# TSA is required for the production shaping:setup_with_automation configuration.
#
# =============================================================================

set -e

# Update CA certificates to trust the test CA
if [ -f /usr/local/share/ca-certificates/test-ca.crt ]; then
  echo "Adding test CA to trust store..."
  cp /usr/local/share/ca-certificates/test-ca.crt /etc/pki/ca-trust/source/anchors/ 2>/dev/null || \
  cp /usr/local/share/ca-certificates/test-ca.crt /usr/local/share/ca-certificates/ 2>/dev/null || true
  update-ca-trust 2>/dev/null || update-ca-certificates 2>/dev/null || true
fi

echo "Starting TSA daemon..."
/opt/kumomta/sbin/tsa-daemon --policy /opt/kumomta/etc/policy/tsa_init.lua &
TSA_PID=$!

# Wait for TSA to be ready
sleep 2

# Verify TSA is running
if ! kill -0 $TSA_PID 2>/dev/null; then
  echo "ERROR: TSA daemon failed to start"
  exit 1
fi

echo "TSA daemon started (PID: $TSA_PID)"

echo "Starting KumoMTA..."
# Use --user kumod to drop privileges (required when running as root)
exec /opt/kumomta/sbin/kumod --policy /opt/kumomta/etc/policy/init.lua --user kumod
