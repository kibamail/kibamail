# Email Platform Infrastructure Monitoring Rulebook

## Platform: kbmta.net

This document defines all critical DNS records and infrastructure components that MUST be monitored continuously to ensure customer email delivery is never interrupted.

---

## Table of Contents

1. [Critical DNS Records](#1-critical-dns-records)
2. [Infrastructure Health Checks](#2-infrastructure-health-checks)
3. [Monitoring Rules](#3-monitoring-rules)
4. [Alert Severity Levels](#4-alert-severity-levels)
5. [CI/CD Implementation](#5-cicd-implementation)

---

## 1. Critical DNS Records

### 1.1 Return-Path Domain (SPF + Bounce Handling)

| Record    | Type | Host                        | Expected Value                  | Purpose                  |
| --------- | ---- | --------------------------- | ------------------------------- | ------------------------ |
| SPF       | TXT  | `mail.kbmta.net`            | `v=spf1 ip4:... ~all` or `-all` | Authorizes sending IPs   |
| Bounce MX | MX   | `mail.kbmta.net`            | `10 <bounce-server>.kbmta.net`  | Receives bounces         |
| Bounce A  | A    | `<bounce-server>.kbmta.net` | `<BOUNCE_SERVER_IP>`            | Bounce server resolution |

### 1.2 Tracking Domain

| Record          | Type | Host          | Expected Value           | Purpose                  |
| --------------- | ---- | ------------- | ------------------------ | ------------------------ |
| Tracking        | A    | `e.kbmta.net` | `<TRACKING_SERVER_IP>`   | Click/open tracking      |
| Tracking (IPv6) | AAAA | `e.kbmta.net` | `<TRACKING_SERVER_IPV6>` | IPv6 tracking (optional) |

### 1.3 Sending Infrastructure

| Record       | Type | Host             | Expected Value   | Purpose        |
| ------------ | ---- | ---------------- | ---------------- | -------------- |
| MTA A Record | A    | `mta1.kbmta.net` | `<MTA1_IP>`      | Sending server |
| MTA PTR      | PTR  | `<MTA1_IP>`      | `mta1.kbmta.net` | Reverse DNS    |
| MTA A Record | A    | `mta2.kbmta.net` | `<MTA2_IP>`      | Sending server |
| MTA PTR      | PTR  | `<MTA2_IP>`      | `mta2.kbmta.net` | Reverse DNS    |

### 1.4 Root Domain

| Record         | Type | Host               | Expected Value      | Purpose            |
| -------------- | ---- | ------------------ | ------------------- | ------------------ |
| Root A         | A    | `kbmta.net`        | `<ROOT_IP>`         | Domain resolution  |
| Root MX        | MX   | `kbmta.net`        | `10 mail.kbmta.net` | Platform email     |
| Platform SPF   | TXT  | `kbmta.net`        | `v=spf1 ...`        | Platform's own SPF |
| Platform DMARC | TXT  | `_dmarc.kbmta.net` | `v=DMARC1; p=...`   | Platform's DMARC   |

---

## 2. Infrastructure Health Checks

### 2.1 SMTP Connectivity

| Check    | Target           | Port | Expected                   |
| -------- | ---------------- | ---- | -------------------------- |
| SMTP     | `mta1.kbmta.net` | 25   | Connection + EHLO response |
| SMTP     | `mta2.kbmta.net` | 25   | Connection + EHLO response |
| SMTP TLS | `mta1.kbmta.net` | 587  | STARTTLS supported         |
| SMTP TLS | `mta2.kbmta.net` | 587  | STARTTLS supported         |

### 2.2 HTTP/HTTPS (Tracking Domain)

| Check    | Target                | Port | Expected                       |
| -------- | --------------------- | ---- | ------------------------------ |
| HTTPS    | `https://e.kbmta.net` | 443  | 2xx/3xx response               |
| TLS Cert | `e.kbmta.net`         | 443  | Valid cert, >14 days to expiry |

### 2.3 Bounce Processing

| Check        | Target           | Port | Expected            |
| ------------ | ---------------- | ---- | ------------------- |
| SMTP Inbound | `mail.kbmta.net` | 25   | Accepts connections |

---

## 3. Monitoring Rules

### 3.1 DNS Record Validation Rules

```yaml
rules:
  # ============================================
  # RULE 1: SPF Record at mail.kbmta.net
  # ============================================
  - id: SPF_RETURN_PATH
    name: "Return-Path SPF Record"
    severity: CRITICAL
    type: dns_txt
    host: mail.kbmta.net
    checks:
      - exists: true
      - starts_with: "v=spf1"
      - contains_any:
          - "ip4:"
          - "ip6:"
          - "include:"
      - ends_with_any:
          - "~all"
          - "-all"
      - spf_valid: true # No syntax errors
      - spf_lookup_count: "<=10" # SPF 10 lookup limit
    alert_message: "SPF record missing or invalid - ALL CUSTOMER EMAILS WILL FAIL SPF"

  # ============================================
  # RULE 2: MX Record at mail.kbmta.net
  # ============================================
  - id: MX_BOUNCE_HANDLER
    name: "Bounce Handler MX Record"
    severity: CRITICAL
    type: dns_mx
    host: mail.kbmta.net
    checks:
      - exists: true
      - priority: "<=50"
      - resolves_to_ip: true
    alert_message: "MX record missing - BOUNCE PROCESSING WILL FAIL"

  # ============================================
  # RULE 3: Tracking Domain A Record
  # ============================================
  - id: TRACKING_A_RECORD
    name: "Tracking Domain A Record"
    severity: CRITICAL
    type: dns_a
    host: e.kbmta.net
    checks:
      - exists: true
      - ip_matches: "${TRACKING_SERVER_IP}"
    alert_message: "Tracking domain not resolving - CLICK TRACKING BROKEN"

  # ============================================
  # RULE 4: Sending IP PTR Records
  # ============================================
  - id: PTR_MTA_SERVERS
    name: "MTA Reverse DNS (PTR)"
    severity: CRITICAL
    type: dns_ptr
    hosts:
      - "${MTA1_IP}"
      - "${MTA2_IP}"
    checks:
      - exists: true
      - ends_with: ".kbmta.net"
      - forward_confirms: true # PTR -> A -> same IP
    alert_message: "PTR record missing or mismatched - EMAILS WILL BE REJECTED"

  # ============================================
  # RULE 5: MTA A Records
  # ============================================
  - id: MTA_A_RECORDS
    name: "MTA Server A Records"
    severity: CRITICAL
    type: dns_a
    hosts:
      - mta1.kbmta.net
      - mta2.kbmta.net
    checks:
      - exists: true
      - resolves: true
    alert_message: "MTA hostname not resolving"

  # ============================================
  # RULE 6: SPF Sending IPs Consistency
  # ============================================
  - id: SPF_IP_CONSISTENCY
    name: "SPF Contains All Sending IPs"
    severity: CRITICAL
    type: spf_ip_audit
    spf_record: mail.kbmta.net
    required_ips:
      - "${MTA1_IP}"
      - "${MTA2_IP}"
    checks:
      - all_ips_included: true
    alert_message: "Sending IP not in SPF record - EMAILS FROM THIS IP WILL FAIL SPF"

  # ============================================
  # RULE 7: DMARC for Platform Domain
  # ============================================
  - id: DMARC_PLATFORM
    name: "Platform DMARC Record"
    severity: HIGH
    type: dns_txt
    host: _dmarc.kbmta.net
    checks:
      - exists: true
      - starts_with: "v=DMARC1"
      - contains: "p="
    alert_message: "Platform DMARC record missing"

  # ============================================
  # RULE 8: TLS Certificate Validity
  # ============================================
  - id: TLS_TRACKING_DOMAIN
    name: "Tracking Domain TLS Certificate"
    severity: HIGH
    type: tls_cert
    host: e.kbmta.net
    port: 443
    checks:
      - valid: true
      - days_until_expiry: ">=14"
      - hostname_matches: true
    alert_message: "TLS certificate expiring soon or invalid"

  # ============================================
  # RULE 9: DNS Propagation Consistency
  # ============================================
  - id: DNS_PROPAGATION
    name: "DNS Propagation Across Resolvers"
    severity: MEDIUM
    type: dns_propagation
    hosts:
      - mail.kbmta.net
      - e.kbmta.net
    resolvers:
      - 8.8.8.8 # Google
      - 1.1.1.1 # Cloudflare
      - 9.9.9.9 # Quad9
      - 208.67.222.222 # OpenDNS
    checks:
      - all_resolvers_agree: true
    alert_message: "DNS records inconsistent across resolvers"

  # ============================================
  # RULE 10: SMTP Connectivity
  # ============================================
  - id: SMTP_CONNECTIVITY
    name: "MTA SMTP Reachability"
    severity: CRITICAL
    type: smtp_connect
    hosts:
      - host: mta1.kbmta.net
        port: 25
      - host: mta2.kbmta.net
        port: 25
    checks:
      - connects: true
      - banner_contains: "220"
      - supports_starttls: true
    alert_message: "SMTP server unreachable - SENDING DISRUPTED"

  # ============================================
  # RULE 11: Bounce Server SMTP Inbound
  # ============================================
  - id: BOUNCE_SMTP_INBOUND
    name: "Bounce Server Accepting Connections"
    severity: HIGH
    type: smtp_connect
    host: mail.kbmta.net
    port: 25
    checks:
      - connects: true
      - banner_contains: "220"
    alert_message: "Bounce server not accepting connections - BOUNCE PROCESSING IMPAIRED"

  # ============================================
  # RULE 12: Tracking Endpoint HTTP Health
  # ============================================
  - id: TRACKING_HTTP_HEALTH
    name: "Tracking Endpoint Responding"
    severity: HIGH
    type: http_get
    url: "https://e.kbmta.net/health"
    checks:
      - status_code: 200
      - response_time_ms: "<5000"
    alert_message: "Tracking endpoint not responding"
```

### 3.2 SPF-Specific Validation

```yaml
spf_validation:
  record: mail.kbmta.net

  checks:
    # Syntax validation
    - valid_syntax: true

    # Lookup limit (RFC 7208 - max 10 DNS lookups)
    - dns_lookup_count: "<=10"

    # No deprecated mechanisms
    - no_ptr_mechanism: true # ptr: is deprecated

    # Proper termination
    - has_all_mechanism: true

    # No duplicate mechanisms
    - no_duplicates: true

    # All IPs reachable
    - all_ips_valid: true

  warnings:
    # Warn if getting close to lookup limit
    - dns_lookup_count: ">7"
      message: "SPF approaching 10 lookup limit"

    # Warn on softfail vs hardfail
    - ends_with: "~all"
      message: "Consider using -all (hardfail) for stricter policy"
```

---

## 4. Alert Severity Levels

| Severity     | Response Time       | Impact                   | Examples                                |
| ------------ | ------------------- | ------------------------ | --------------------------------------- |
| **CRITICAL** | Immediate (< 5 min) | Complete sending failure | SPF missing, PTR wrong, MTA down        |
| **HIGH**     | < 30 min            | Partial degradation      | Bounce processing down, TLS expiring    |
| **MEDIUM**   | < 4 hours           | Potential future issues  | DNS propagation lag, approaching limits |
| **LOW**      | < 24 hours          | Best practice violations | Missing optional records                |

### Escalation Matrix

```yaml
escalation:
  critical:
    - alert_channels: [pagerduty, slack_oncall, sms]
    - escalate_after: 5m
    - escalate_to: engineering_lead

  high:
    - alert_channels: [slack_oncall, email]
    - escalate_after: 30m
    - escalate_to: engineering_team

  medium:
    - alert_channels: [slack_alerts]
    - escalate_after: 4h
    - escalate_to: engineering_team

  low:
    - alert_channels: [email_daily_digest]
    - escalate_after: 24h
    - escalate_to: none
```

---

## 5. CI/CD Implementation

### 5.1 Environment Variables

```bash
# .env.monitoring
MTA1_IP=203.0.113.10
MTA2_IP=203.0.113.11
BOUNCE_SERVER_IP=203.0.113.20
TRACKING_SERVER_IP=203.0.113.30
TRACKING_SERVER_IPV6=2001:db8::30
```

### 5.2 Bash Implementation

```bash
#!/bin/bash
# dns-monitor.sh - Email Platform DNS Monitoring Script

set -euo pipefail

# Configuration
source .env.monitoring

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILURES=0
WARNINGS=0

# ============================================
# Helper Functions
# ============================================

log_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
log_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAILURES=$((FAILURES+1)); }
log_warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; WARNINGS=$((WARNINGS+1)); }

dns_lookup() {
    local type=$1
    local host=$2
    dig +short "$type" "$host" 2>/dev/null
}

check_record_exists() {
    local type=$1
    local host=$2
    local result=$(dns_lookup "$type" "$host")
    if [[ -n "$result" ]]; then
        return 0
    else
        return 1
    fi
}

# ============================================
# DNS Record Checks
# ============================================

echo "========================================"
echo "EMAIL PLATFORM DNS MONITORING"
echo "========================================"
echo ""

# --- CRITICAL: SPF at mail.kbmta.net ---
echo "Checking: SPF Record (mail.kbmta.net)"
SPF_RECORD=$(dns_lookup TXT mail.kbmta.net | grep "v=spf1" || true)
if [[ -z "$SPF_RECORD" ]]; then
    log_fail "[CRITICAL] SPF record missing at mail.kbmta.net"
elif [[ ! "$SPF_RECORD" =~ ^\"v=spf1.*(~all|-all)\"$ ]]; then
    log_fail "[CRITICAL] SPF record malformed: $SPF_RECORD"
else
    log_pass "SPF record exists: $SPF_RECORD"

    # Check SPF lookup count
    # This is a simplified check - production should use a proper SPF library
    INCLUDE_COUNT=$(echo "$SPF_RECORD" | grep -o "include:" | wc -l)
    if [[ $INCLUDE_COUNT -gt 7 ]]; then
        log_warn "SPF has $INCLUDE_COUNT includes - approaching 10 lookup limit"
    fi
fi

# --- CRITICAL: MX at mail.kbmta.net ---
echo ""
echo "Checking: MX Record (mail.kbmta.net)"
MX_RECORD=$(dns_lookup MX mail.kbmta.net)
if [[ -z "$MX_RECORD" ]]; then
    log_fail "[CRITICAL] MX record missing at mail.kbmta.net - bounces will fail"
else
    log_pass "MX record exists: $MX_RECORD"

    # Verify MX target resolves
    MX_HOST=$(echo "$MX_RECORD" | awk '{print $2}')
    MX_IP=$(dns_lookup A "$MX_HOST")
    if [[ -z "$MX_IP" ]]; then
        log_fail "[CRITICAL] MX target $MX_HOST does not resolve"
    else
        log_pass "MX target resolves: $MX_HOST -> $MX_IP"
    fi
fi

# --- CRITICAL: Tracking Domain A Record ---
echo ""
echo "Checking: Tracking Domain (e.kbmta.net)"
TRACKING_IP=$(dns_lookup A e.kbmta.net)
if [[ -z "$TRACKING_IP" ]]; then
    log_fail "[CRITICAL] Tracking domain e.kbmta.net has no A record"
elif [[ "$TRACKING_IP" != "$TRACKING_SERVER_IP" ]]; then
    log_fail "[CRITICAL] Tracking IP mismatch: expected $TRACKING_SERVER_IP, got $TRACKING_IP"
else
    log_pass "Tracking domain resolves correctly: $TRACKING_IP"
fi

# --- CRITICAL: PTR Records for Sending IPs ---
echo ""
echo "Checking: PTR Records (Reverse DNS)"
for IP in $MTA1_IP $MTA2_IP; do
    # Convert IP to reverse lookup format
    REVERSE=$(echo "$IP" | awk -F. '{print $4"."$3"."$2"."$1".in-addr.arpa"}')
    PTR=$(dns_lookup PTR "$REVERSE")

    if [[ -z "$PTR" ]]; then
        log_fail "[CRITICAL] No PTR record for $IP"
    elif [[ ! "$PTR" =~ \.kbmta\.net\.?$ ]]; then
        log_fail "[CRITICAL] PTR for $IP does not point to kbmta.net: $PTR"
    else
        # Verify forward-confirmed reverse DNS (FCrDNS)
        FORWARD_IP=$(dns_lookup A "${PTR%.}")
        if [[ "$FORWARD_IP" != "$IP" ]]; then
            log_fail "[CRITICAL] FCrDNS mismatch: $IP -> $PTR -> $FORWARD_IP"
        else
            log_pass "PTR valid: $IP -> $PTR (FCrDNS confirmed)"
        fi
    fi
done

# --- CRITICAL: MTA A Records ---
echo ""
echo "Checking: MTA A Records"
for MTA in mta1.kbmta.net mta2.kbmta.net; do
    MTA_IP=$(dns_lookup A "$MTA")
    if [[ -z "$MTA_IP" ]]; then
        log_fail "[CRITICAL] $MTA has no A record"
    else
        log_pass "$MTA resolves to $MTA_IP"
    fi
done

# --- HIGH: Platform DMARC ---
echo ""
echo "Checking: Platform DMARC (_dmarc.kbmta.net)"
DMARC_RECORD=$(dns_lookup TXT _dmarc.kbmta.net | grep "v=DMARC1" || true)
if [[ -z "$DMARC_RECORD" ]]; then
    log_warn "[HIGH] DMARC record missing at _dmarc.kbmta.net"
else
    log_pass "DMARC record exists: $DMARC_RECORD"
fi

# ============================================
# Connectivity Checks
# ============================================

echo ""
echo "========================================"
echo "CONNECTIVITY CHECKS"
echo "========================================"

# --- CRITICAL: SMTP Connectivity ---
echo ""
echo "Checking: SMTP Connectivity"
for MTA in mta1.kbmta.net mta2.kbmta.net; do
    if timeout 5 bash -c "echo 'QUIT' | nc -w 5 $MTA 25" 2>/dev/null | grep -q "220"; then
        log_pass "SMTP reachable: $MTA:25"
    else
        log_fail "[CRITICAL] SMTP unreachable: $MTA:25"
    fi
done

# --- HIGH: Tracking HTTPS ---
echo ""
echo "Checking: Tracking Domain HTTPS"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://e.kbmta.net/" 2>/dev/null || echo "000")
if [[ "$HTTP_STATUS" =~ ^[23] ]]; then
    log_pass "Tracking HTTPS responding: HTTP $HTTP_STATUS"
else
    log_fail "[HIGH] Tracking HTTPS not responding: HTTP $HTTP_STATUS"
fi

# --- HIGH: TLS Certificate ---
echo ""
echo "Checking: TLS Certificate Expiry"
CERT_EXPIRY=$(echo | openssl s_client -servername e.kbmta.net -connect e.kbmta.net:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [[ -n "$CERT_EXPIRY" ]]; then
    EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [[ $DAYS_LEFT -lt 7 ]]; then
        log_fail "[CRITICAL] TLS certificate expires in $DAYS_LEFT days"
    elif [[ $DAYS_LEFT -lt 14 ]]; then
        log_warn "[HIGH] TLS certificate expires in $DAYS_LEFT days"
    else
        log_pass "TLS certificate valid for $DAYS_LEFT days"
    fi
else
    log_fail "[HIGH] Could not check TLS certificate"
fi

# ============================================
# DNS Propagation Check
# ============================================

echo ""
echo "========================================"
echo "DNS PROPAGATION CHECK"
echo "========================================"

RESOLVERS=("8.8.8.8" "1.1.1.1" "9.9.9.9" "208.67.222.222")
RESOLVER_NAMES=("Google" "Cloudflare" "Quad9" "OpenDNS")

for HOST in mail.kbmta.net e.kbmta.net; do
    echo ""
    echo "Checking propagation for: $HOST"
    RESULTS=()

    for i in "${!RESOLVERS[@]}"; do
        RESULT=$(dig +short @"${RESOLVERS[$i]}" A "$HOST" 2>/dev/null | head -1)
        RESULTS+=("$RESULT")
        echo "  ${RESOLVER_NAMES[$i]}: $RESULT"
    done

    # Check if all results match
    UNIQUE_RESULTS=$(printf '%s\n' "${RESULTS[@]}" | sort -u | wc -l)
    if [[ $UNIQUE_RESULTS -eq 1 ]] && [[ -n "${RESULTS[0]}" ]]; then
        log_pass "DNS consistent across all resolvers for $HOST"
    else
        log_warn "[MEDIUM] DNS inconsistent across resolvers for $HOST"
    fi
done

# ============================================
# Summary
# ============================================

echo ""
echo "========================================"
echo "MONITORING SUMMARY"
echo "========================================"
echo ""

if [[ $FAILURES -gt 0 ]]; then
    echo -e "${RED}FAILURES: $FAILURES${NC}"
fi

if [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}WARNINGS: $WARNINGS${NC}"
fi

if [[ $FAILURES -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}ALL CHECKS PASSED${NC}"
fi

echo ""

# Exit with appropriate code
if [[ $FAILURES -gt 0 ]]; then
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    exit 2
else
    exit 0
fi
```

### 5.3 GitHub Actions Workflow

```yaml
# .github/workflows/dns-monitoring.yml
name: DNS Infrastructure Monitoring

on:
  schedule:
    # Run every 5 minutes
    - cron: "*/5 * * * *"
  workflow_dispatch:
  push:
    paths:
      - "monitoring/**"

env:
  MTA1_IP: ${{ secrets.MTA1_IP }}
  MTA2_IP: ${{ secrets.MTA2_IP }}
  TRACKING_SERVER_IP: ${{ secrets.TRACKING_SERVER_IP }}

jobs:
  dns-critical-checks:
    name: Critical DNS Checks
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y dnsutils netcat-openbsd

      - name: Check SPF Record
        id: spf
        run: |
          SPF=$(dig +short TXT mail.kbmta.net | grep "v=spf1" || true)
          if [[ -z "$SPF" ]]; then
            echo "::error::CRITICAL - SPF record missing at mail.kbmta.net"
            exit 1
          fi
          echo "SPF Record: $SPF"

      - name: Check MX Record
        id: mx
        run: |
          MX=$(dig +short MX mail.kbmta.net)
          if [[ -z "$MX" ]]; then
            echo "::error::CRITICAL - MX record missing at mail.kbmta.net"
            exit 1
          fi
          echo "MX Record: $MX"

      - name: Check Tracking Domain
        id: tracking
        run: |
          IP=$(dig +short A e.kbmta.net)
          if [[ -z "$IP" ]]; then
            echo "::error::CRITICAL - Tracking domain e.kbmta.net not resolving"
            exit 1
          fi
          if [[ "$IP" != "$TRACKING_SERVER_IP" ]]; then
            echo "::error::CRITICAL - Tracking IP mismatch"
            exit 1
          fi
          echo "Tracking IP: $IP"

      - name: Check PTR Records
        id: ptr
        run: |
          for IP in $MTA1_IP $MTA2_IP; do
            REVERSE=$(echo "$IP" | awk -F. '{print $4"."$3"."$2"."$1".in-addr.arpa"}')
            PTR=$(dig +short PTR "$REVERSE")
            if [[ -z "$PTR" ]]; then
              echo "::error::CRITICAL - No PTR record for $IP"
              exit 1
            fi
            echo "PTR for $IP: $PTR"
          done

      - name: Check SMTP Connectivity
        id: smtp
        run: |
          for HOST in mta1.kbmta.net mta2.kbmta.net; do
            if ! timeout 10 bash -c "echo 'QUIT' | nc -w 5 $HOST 25" | grep -q "220"; then
              echo "::error::CRITICAL - SMTP unreachable at $HOST"
              exit 1
            fi
            echo "SMTP OK: $HOST"
          done

      - name: Alert on Failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "channel": "#alerts-critical",
              "text": "🚨 CRITICAL: Email infrastructure check failed!",
              "attachments": [
                {
                  "color": "danger",
                  "fields": [
                    {
                      "title": "Failed Check",
                      "value": "${{ github.job }}",
                      "short": true
                    },
                    {
                      "title": "Run URL",
                      "value": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
                      "short": false
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  tls-certificate-check:
    name: TLS Certificate Check
    runs-on: ubuntu-latest

    steps:
      - name: Check Certificate Expiry
        run: |
          EXPIRY=$(echo | openssl s_client -servername e.kbmta.net -connect e.kbmta.net:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
          EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
          NOW_EPOCH=$(date +%s)
          DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

          echo "Certificate expires in $DAYS_LEFT days"

          if [[ $DAYS_LEFT -lt 7 ]]; then
            echo "::error::CRITICAL - TLS certificate expires in $DAYS_LEFT days"
            exit 1
          elif [[ $DAYS_LEFT -lt 14 ]]; then
            echo "::warning::TLS certificate expires in $DAYS_LEFT days"
          fi
```

### 5.4 Quick Reference: Exit Codes

| Exit Code | Meaning           | Action                       |
| --------- | ----------------- | ---------------------------- |
| 0         | All checks passed | None                         |
| 1         | Critical failure  | Immediate alert, investigate |
| 2         | Warnings only     | Review within 4 hours        |

---

## Appendix A: Record Cheat Sheet

```
PLATFORM RECORDS (you maintain these)
=====================================
mail.kbmta.net      TXT   "v=spf1 ip4:x.x.x.x ip4:y.y.y.y ~all"
mail.kbmta.net      MX    10 bounces.kbmta.net
e.kbmta.net         A     <tracking-server-ip>
mta1.kbmta.net      A     <mta1-ip>
mta2.kbmta.net      A     <mta2-ip>
<mta1-ip>           PTR   mta1.kbmta.net
<mta2-ip>           PTR   mta2.kbmta.net
_dmarc.kbmta.net    TXT   "v=DMARC1; p=reject; rua=..."


CUSTOMER RECORDS (they maintain these)
=====================================
kb.<domain>                      CNAME   mail.kbmta.net
kibamail._domainkey.<domain>     TXT     k=rsa;p=...
e.<domain>                       CNAME   e.kbmta.net
_dmarc.<domain>                  TXT     v=DMARC1; p=none; ...
```

---

## Appendix B: Testing Commands

```bash
# Quick health check - run all critical checks
./dns-monitor.sh

# Check specific SPF record
dig +short TXT mail.kbmta.net

# Validate SPF syntax (requires spfquery tool)
spfquery -sender=test@mail.kbmta.net -ip=YOUR_MTA_IP -helo=mta1.kbmta.net

# Check PTR record
dig +short -x YOUR_MTA_IP

# Test SMTP connectivity
echo "QUIT" | nc -v mta1.kbmta.net 25

# Check TLS certificate
echo | openssl s_client -servername e.kbmta.net -connect e.kbmta.net:443 2>/dev/null | openssl x509 -noout -dates

# Full DNS audit across resolvers
for DNS in 8.8.8.8 1.1.1.1 9.9.9.9; do
  echo "=== $DNS ==="
  dig +short @$DNS TXT mail.kbmta.net
done
```
