#!/bin/sh
# Initialize NATS JetStream streams and consumers for development
# This script runs once when the NATS container starts

echo "Waiting for NATS to be ready..."
sleep 3

# Create NATS context for authenticated access
nats context save dev \
  --server "$NATS_URL" \
  --user "$NATS_USER" \
  --password "$NATS_PASSWORD" \
  --tlsca "$NATS_CA" \
  --select

echo "Creating JetStream streams..."

# EMAILS stream - for email messages to be sent
# This is where the control plane publishes email jobs
nats stream add EMAILS \
  --subjects="kibamail.emails.>" \
  --storage=file \
  --replicas=1 \
  --retention=limits \
  --max-msgs=-1 \
  --max-bytes=1073741824 \
  --max-age=168h \
  --max-msg-size=1048576 \
  --discard=old \
  --dupe-window=2m \
  --defaults \
  2>&1 || echo "Stream EMAILS may already exist"

# EVENTS stream - for events from email agent (deliveries, bounces, etc.)
nats stream add EVENTS \
  --subjects="kibamail.events.>" \
  --storage=file \
  --replicas=1 \
  --retention=limits \
  --max-msgs=-1 \
  --max-bytes=1073741824 \
  --max-age=720h \
  --max-msg-size=65536 \
  --discard=old \
  --dupe-window=2m \
  --defaults \
  2>&1 || echo "Stream EVENTS may already exist"

# COMMANDS stream - for control plane commands to email agent
nats stream add COMMANDS \
  --subjects="kibamail.commands.>" \
  --storage=file \
  --replicas=1 \
  --retention=limits \
  --max-msgs=-1 \
  --max-bytes=268435456 \
  --max-age=24h \
  --max-msg-size=65536 \
  --discard=old \
  --dupe-window=2m \
  --defaults \
  2>&1 || echo "Stream COMMANDS may already exist"

echo "Creating consumers..."

# Email agent consumer - processes email messages
nats consumer add EMAILS email_agent_consumer \
  --filter="kibamail.emails.>" \
  --ack=explicit \
  --deliver=all \
  --max-deliver=5 \
  --max-pending=1000 \
  --wait=30s \
  --replay=instant \
  --pull \
  --defaults \
  2>&1 || echo "Consumer email_agent_consumer may already exist"

echo ""
echo "JetStream initialization complete!"
echo ""
echo "Listing streams:"
nats stream ls 2>&1 || true
echo ""
echo "Listing consumers for EMAILS stream:"
nats consumer ls EMAILS 2>&1 || true

exit 0
