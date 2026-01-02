# KumoMTA Integration Testing Guide

This document explains how to run the MTA integration tests, how they work internally, and how to debug common issues.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Running the Tests](#running-the-tests)
5. [Test Suite Details](#test-suite-details)
6. [How Tests Work](#how-tests-work)
7. [Debugging Guide](#debugging-guide)
8. [Common Issues](#common-issues)

---

## Overview

The integration tests verify the complete email delivery pipeline from message injection to final delivery, including:

- **Email Delivery**: NATS → email-agent → KumoMTA → SMTP server
- **DKIM Signing**: 2-fold DKIM (tenant + MTA signatures)
- **Bounce Reception**: External MTA → KumoMTA port 25 → OOB/ARF parsing
- **DMARC Reports**: DMARC aggregate reports → KumoMTA → email-agent → S3

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Docker Network: 172.28.0.0/16                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │   dnsmasq    │     │    redis     │     │     nats     │                 │
│  │  172.28.0.2  │     │  172.28.0.7  │     │  172.28.0.8  │                 │
│  │   (DNS)      │     │   (cache)    │     │  :14222      │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │    minio     │     │ email-agent  │     │   kumomta    │                 │
│  │  172.28.0.9  │◄────│  172.28.0.4  │◄────│  172.28.0.3  │                 │
│  │  :19000      │     │    :8080     │     │ :25,:587,:8k │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│                              │                    │                          │
│                              ▼                    ▼                          │
│                       ┌──────────────┐     ┌──────────────┐                 │
│                       │ kumoproxy    │     │ smtp-server  │                 │
│                       │  172.28.0.6  │────►│  172.28.0.5  │                 │
│                       │  (SOCKS5)    │     │    :8025     │                 │
│                       └──────────────┘     └──────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Host Machine                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐          ┌──────────────────┐                         │
│  │ control-plane    │          │   test runner    │                         │
│  │ localhost:3334   │◄─────────│   go test ...    │                         │
│  │ (mock API)       │          │                  │                         │
│  └──────────────────┘          └──────────────────┘                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Roles

| Component | IP Address | Ports | Purpose |
|-----------|------------|-------|---------|
| dnsmasq | 172.28.0.2 | 53 | Custom DNS for routing all email to smtp-server |
| kumomta | 172.28.0.3 | 25, 587, 8000 | MTA under test |
| email-agent | 172.28.0.4 | 8080 | Bridges NATS/S3 to KumoMTA |
| smtp-server | 172.28.0.5 | 25, 8025 | Catches all outbound email (Mailpit-like) |
| kumoproxy | 172.28.0.6 | 1080 | SOCKS5 proxy for all outbound SMTP |
| redis | 172.28.0.7 | 6379 | Caching and TSA storage |
| nats | 172.28.0.8 | 4222 | Message queue for email jobs |
| minio | 172.28.0.9 | 9000 | S3-compatible storage for content |
| control-plane | host:3334 | 3334 | Mock API for tenant/DKIM lookups |

---

## Prerequisites

### 1. Install Dependencies

```bash
# Go 1.21+
go version

# Docker with Compose v2
docker compose version

# OpenSSL (for certificate generation)
openssl version
```

### 2. Generate Test Certificates

```bash
cd apps/mta/tests
./scripts/generate-certs.sh
```

This generates:
- TLS certificates for SMTP/STARTTLS
- DKIM keys for tenant domains (hq.kibamail.xyz, testcustomer.com)
- DKIM key for MTA domain (kbmta.net)
- CA certificate for the test environment

### 3. Build Dependencies

```bash
# Build email-agent image
cd apps/email-agent
docker build -t email-agent .

# Or let docker compose build it
cd apps/mta/tests
docker compose build
```

---

## Running the Tests

### One-Command Execution (Recommended)

The easiest way to run tests is using the automated script:

```bash
cd apps/mta/tests

# Run all tests (sets up, runs, tears down automatically)
./run-tests.sh

# Run specific tests
./run-tests.sh TestBounce           # Run bounce tests only
./run-tests.sh TestDMARC            # Run DMARC tests only
./run-tests.sh TestEmailDelivery    # Run email delivery test

# Keep environment running after tests (for debugging)
./run-tests.sh --keep

# Setup only (don't run tests)
./run-tests.sh --setup

# Teardown only
./run-tests.sh --teardown

# Run tests only (assumes setup is done)
./run-tests.sh --test-only
```

### Manual Step-by-Step Execution

If you prefer to run each step manually:

```bash
cd apps/mta/tests

# 1. Start Docker infrastructure
docker compose up -d

# 2. Wait for all services to be healthy (30-60 seconds)
docker compose ps
# All services should show "healthy" status

# 3. Start the control plane mock (separate terminal)
go run ./cmd/controlplane

# Expected output:
# 2025/12/22 22:06:52 Loaded DKIM key for hq.kibamail.xyz
# 2025/12/22 22:06:52 Loaded DKIM key for testcustomer.com
# 2025/12/22 22:06:52 Control Plane Mock starting on port 3334

# 4. Run the tests (separate terminal)
INTEGRATION_TEST=1 go test -v ./integration/...
```

### Quick Commands

```bash
# Run all tests
INTEGRATION_TEST=1 go test -v ./integration/...

# Run specific test
INTEGRATION_TEST=1 go test -v ./integration/... -run TestEmailDeliveryWithDKIM

# Run bounce tests only
INTEGRATION_TEST=1 go test -v ./integration/... -run TestBounce

# Run DMARC tests only
INTEGRATION_TEST=1 go test -v ./integration/... -run TestDMARC

# Run with race detection
INTEGRATION_TEST=1 go test -v -race ./integration/...
```

### Cleanup

```bash
# Using the script
./run-tests.sh --teardown

# Or manually
docker compose down -v
# Press Ctrl+C in the terminal running the control plane mock
```

---

## Test Suite Details

### 1. Email Delivery Test (`email_delivery_test.go`)

**Purpose**: Verify complete email delivery pipeline with 2-fold DKIM signing.

**Test Flow**:
```
Test → Upload content to S3 (MinIO)
     → Publish message to NATS
     → email-agent picks up message
     → email-agent fetches content from S3
     → email-agent injects to KumoMTA via HTTP API
     → KumoMTA signs with tenant DKIM
     → KumoMTA signs with MTA DKIM
     → KumoMTA delivers via SOCKS5 proxy
     → smtp-server receives email
     → Test verifies DKIM signatures
```

**Verifications**:
- Email arrives in smtp-server
- Subject and From/To addresses match
- Tenant DKIM signature present (d=hq.kibamail.xyz)
- MTA DKIM signature present (d=kbmta.net)

### 2. Bounce Reception Tests (`bounce_reception_test.go`)

**Purpose**: Verify inbound bounce/DSN and ARF complaint handling.

**Tests**:

| Test | Description |
|------|-------------|
| `TestBounceReception` | Accept bounce emails to known domains |
| `TestBounceWithPostmasterSender` | Accept bounces from postmaster addresses |
| `TestBounceRejectionForUnknownDomain` | Reject bounces to unknown domains |
| `TestARFComplaintReception` | Accept ARF abuse complaints |

**Test Flow**:
```
Test → Connect to KumoMTA port 25
     → Send DSN/ARF email via SMTP
     → KumoMTA validates recipient domain via email-agent
     → email-agent checks domain against control-plane
     → If valid: Accept and process (log_oob/log_arf)
     → If invalid: Reject with 550 error
```

### 3. DMARC Reception Tests (`dmarc_reception_test.go`)

**Purpose**: Verify DMARC aggregate report reception and storage.

**Tests**:

| Test | Description |
|------|-------------|
| `TestDMARCReportReception` | Accept and store DMARC reports |
| `TestDMARCReportRejectionForUnknownDomain` | Reject reports to unknown domains |

**Test Flow**:
```
Test → Connect to KumoMTA port 25
     → Send DMARC report (multipart with gzipped XML)
     → KumoMTA accepts mail to dmarc.kbmta.net
     → KumoMTA routes to custom_lua handler
     → Handler forwards raw email to email-agent
     → email-agent stores report in S3
     → Test verifies report in S3
```

---

## How Tests Work

### DNS Resolution

All DNS queries go through dnsmasq (172.28.0.2), which:

1. Resolves infrastructure hostnames to container IPs
2. Routes ALL MX queries to smtp-server (172.28.0.5)
3. Provides TXT records for SPF/DKIM/DMARC

Example from `dns/dnsmasq.conf`:
```
# All gmail.com email goes to test SMTP server
mx-host=gmail.com,smtp.test.local,10
address=/smtp.test.local/172.28.0.5

# Wildcard MX - catch all domains
mx-host=#,smtp.test.local,10
```

### SOCKS5 Proxy

KumoMTA uses kumoproxy (SOCKS5 on port 1080) for all outbound SMTP. This ensures:

1. All email goes through DNS (dnsmasq)
2. All email ends up at smtp-server
3. No email escapes to the real internet

Configured in `sources.toml`:
```toml
[source."ip-1"]
socks5_proxy = "172.28.0.6:1080"
```

### Control Plane Mock

The mock provides these endpoints for email-agent:

| Endpoint | Purpose |
|----------|---------|
| `/api/internal/v1/tenants/by-domain/{domain}` | Tenant lookup by sending domain |
| `/api/internal/v1/tenants/by-bounce-domain/{domain}` | Validate bounce domain |
| `/api/internal/v1/auth/validate` | API key validation |
| `/api/internal/v1/dkim/{domain}` | DKIM private key retrieval |

Pre-configured test data:
- Workspace `ws_test_123` with domain `hq.kibamail.xyz`
- Workspace `ws_test_456` with domain `testcustomer.com`
- Bounce domains: `kb.hq.kibamail.xyz`, `kb.testcustomer.com`

### Listener Domain Validation

When KumoMTA receives email on port 25:

1. `get_listener_domain` event fires
2. Lua checks if domain is `dmarc.kbmta.net` (accept for DMARC processing)
3. Otherwise, calls `validate_listener_domain(domain)`
4. This makes HTTP request to email-agent
5. email-agent queries control-plane mock
6. Returns `{valid: true}` or `{valid: false}`

---

## Debugging Guide

### View Container Logs

```bash
# All containers
docker compose logs -f

# Specific container
docker compose logs -f kumomta
docker compose logs -f email-agent
docker compose logs -f smtp-server

# Last 100 lines
docker compose logs --tail=100 kumomta
```

### Check Container Health

```bash
# Status of all services
docker compose ps

# Check specific service health
docker inspect kbmta-mta --format='{{.State.Health.Status}}'
```

### Access KumoMTA HTTP API

```bash
# Check liveness
curl http://localhost:8000/api/check-liveness/v1

# Check queues (requires auth in production, open in test)
curl http://localhost:8000/api/admin/queues/v1
```

### Access smtp-server (Mailpit) API

```bash
# List all messages
curl http://localhost:8025/api/v1/messages

# Get message details
curl http://localhost:8025/api/v1/message/{id}

# Get message headers (for DKIM verification)
curl http://localhost:8025/api/v1/message/{id}/headers

# Delete all messages
curl -X DELETE http://localhost:8025/api/v1/messages
```

### Access MinIO Console

Open http://localhost:19001 in browser:
- Username: `minioadmin`
- Password: `minioadmin`

Browse bucket `kibamail` to see:
- `content/` - Email content uploaded by tests
- `dmarc-reports/` - DMARC reports stored by email-agent

### Check NATS Streams

```bash
# Connect to NATS container
docker exec -it kbmta-nats nats stream list

# View stream info
docker exec -it kbmta-nats nats stream info EMAILS

# View consumer info
docker exec -it kbmta-nats nats consumer info EMAILS email_agent_consumer
```

### Test Control Plane Mock

```bash
# Health check
curl http://localhost:3334/health

# View current test data
curl http://localhost:3334/test/status

# Test bounce domain validation
curl -H "Authorization: Bearer test-internal-service-key" \
  http://localhost:3334/api/internal/v1/tenants/by-bounce-domain/kb.hq.kibamail.xyz

# Reset test data to defaults
curl -X POST http://localhost:3334/test/reset
```

### Send Test Email Manually

```bash
# Via SMTP (port 587 requires auth, port 25 for bounces only)
# Using swaks (install: brew install swaks)
swaks --to test@gmail.com \
  --from newsletter@hq.kibamail.xyz \
  --server localhost:25 \
  --header "Subject: Test"
```

### Debug Lua Policy

Edit `policy/init.lua` and add logging:

```lua
kumo.log_info('Debug: validating domain ' .. domain)
```

Then restart KumoMTA:
```bash
docker compose restart kumomta
docker compose logs -f kumomta
```

---

## Common Issues

### 1. Tests Skip with "Set INTEGRATION_TEST=1"

**Problem**: Tests skip without the environment variable.

**Solution**:
```bash
INTEGRATION_TEST=1 go test -v ./integration/...
```

### 2. Connection Refused to NATS/MinIO/etc.

**Problem**: Docker containers not running or not healthy.

**Solution**:
```bash
# Check status
docker compose ps

# Restart all services
docker compose down -v
docker compose up -d

# Wait for health checks
sleep 30
docker compose ps
```

### 3. Control Plane Mock Not Running

**Problem**: `dial tcp 127.0.0.1:3334: connection refused`

**Solution**:
```bash
# Start the mock in a separate terminal
cd apps/mta/tests
go run ./cmd/controlplane
```

### 4. DKIM Keys Not Found

**Problem**: Control plane mock logs show no DKIM keys loaded.

**Solution**:
```bash
# Regenerate certificates
./scripts/generate-certs.sh

# Restart control plane mock
# It loads keys from ./certs/
```

### 5. Email Not Arriving in smtp-server

**Problem**: `TestEmailDeliveryWithDKIM` times out waiting for email.

**Debug steps**:
```bash
# 1. Check email-agent logs for errors
docker compose logs -f email-agent

# 2. Check KumoMTA logs for delivery status
docker compose logs -f kumomta

# 3. Check NATS for pending messages
docker exec -it kbmta-nats nats consumer info EMAILS email_agent_consumer

# 4. Check smtp-server received anything
curl http://localhost:8025/api/v1/messages
```

### 6. Bounce Domain Rejection Not Working

**Problem**: `TestBounceRejectionForUnknownDomain` accepts instead of rejects.

**Cause**: The `validate_listener_domain` function in `init.lua` must parse JSON response and check `valid` field.

**Solution**: Ensure init.lua has:
```lua
local data = kumo.json_parse(response:text())
return data and data.valid == true
```

### 7. TLS/Certificate Errors

**Problem**: STARTTLS failures or certificate validation errors.

**Solution**:
```bash
# Regenerate all certificates
cd apps/mta/tests
rm -rf certs/*
./scripts/generate-certs.sh

# Restart containers to pick up new certs
docker compose down
docker compose up -d
```

### 8. Port Conflicts

**Problem**: `bind: address already in use`

**Solution**:
```bash
# Find what's using the port
lsof -i :25
lsof -i :587

# Kill the process or use different ports
# Ports are configured in docker-compose.yml
```

---

## Test Data Reference

### Default Workspaces

| ID | Domain | Bounce Domain | API Key |
|----|--------|---------------|---------|
| ws_test_123 | hq.kibamail.xyz | kb.hq.kibamail.xyz | test-api-key-12345 |
| ws_test_456 | testcustomer.com | kb.testcustomer.com | test-api-key-67890 |

### NATS Configuration

- Stream: `EMAILS`
- Consumer: `email_agent_consumer`
- Subject pattern: `kibamail.emails.{tenantId}`

### S3/MinIO Configuration

- Bucket: `kibamail`
- Access Key: `minioadmin`
- Secret Key: `minioadmin`
- Endpoint: `http://localhost:19000`

---

## Extending the Tests

### Adding a New Test

1. Create test file in `integration/` directory
2. Use `os.Getenv("INTEGRATION_TEST") != "1"` guard
3. Follow existing patterns for NATS/S3/SMTP setup
4. Add cleanup in `defer` statements

### Adding Test Domains

1. Add workspace to control plane mock (`cmd/controlplane/main.go`)
2. Add DNS records to `dns/dnsmasq.conf`
3. Generate DKIM keys with `generate-certs.sh`
4. Update control plane mock to load new keys

### Adding Custom SMTP Tests

Use the `sendBounceEmail` helper pattern:
```go
func sendEmail(t *testing.T, from, to, body string) error {
    conn, err := smtp.Dial("localhost:25")
    // ... standard SMTP conversation
}
```
