#!/bin/bash
# =============================================================================
# KumoMTA + TSA Daemon Startup Script (Test Environment)
# =============================================================================

set -e

echo "=== KumoMTA Test Environment Startup ==="

# Wait for dependencies to be ready
echo "Waiting for services to be ready..."
sleep 3

# Start TSA daemon in background
echo "Starting TSA daemon on port ${TSA_LISTEN_PORT:-8008}..."
/opt/kumomta/sbin/tsa-daemon --policy /opt/kumomta/etc/policy/tsa_init.lua &
TSA_PID=$!

# Wait for TSA to be ready
sleep 2

if ! kill -0 $TSA_PID 2>/dev/null; then
  echo "WARNING: TSA daemon may not have started correctly"
else
  echo "TSA daemon started (PID: $TSA_PID)"
fi

# Check if DKIM key exists
if [ -f /opt/kumomta/etc/dkim/kbmta.net/kbmta.key ]; then
  echo "DKIM key found at /opt/kumomta/etc/dkim/kbmta.net/kbmta.key"
else
  echo "WARNING: DKIM key not found - signing will be skipped"
fi

echo "Starting KumoMTA..."
echo "  Control Plane: ${CONTROL_PLANE_URL}"
echo "  MTA Hostname: ${MTA_HOSTNAME}"
echo "  Webhook URL: ${WEBHOOK_URL}"

# Start KumoMTA (foreground)
exec /opt/kumomta/sbin/kumod --policy /opt/kumomta/etc/policy/init.lua --user kumod
