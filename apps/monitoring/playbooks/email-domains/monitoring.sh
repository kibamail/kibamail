#!/bin/bash
# ============================================================================
# KIBAMAIL DNS INFRASTRUCTURE MONITOR
# ============================================================================
# This script monitors all critical DNS records and infrastructure components
# required for email delivery. Run this in CI every 5 minutes.
#
# Exit codes:
#   0 = All checks passed
#   1 = Critical failure (immediate action required)
#   2 = Warnings only (review within 4 hours)
#
# Usage:
#   ./monitor.sh                    # Run all checks
#   ./monitor.sh --critical-only    # Only critical checks (faster)
#   ./monitor.sh --json             # Output as JSON
# ============================================================================

set -uo pipefail

# ============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================================================

# Your platform domain
PLATFORM_DOMAIN="kbmta.net"

# Return-path subdomain that customers CNAME to
RETURN_PATH_HOST="mail.${PLATFORM_DOMAIN}"

# Tracking domain
TRACKING_HOST="e.${PLATFORM_DOMAIN}"

# Your sending server IPs (add all your MTA IPs)
SENDING_IPS=(
    # "203.0.113.10"    # mta1
    # "203.0.113.11"    # mta2
)

# Your sending server hostnames
MTA_HOSTS=(
    # "mta1.${PLATFORM_DOMAIN}"
    # "mta2.${PLATFORM_DOMAIN}"
)

# Expected tracking server IP
TRACKING_IP=""  # e.g., "203.0.113.30"

# DNS resolvers for propagation checks
DNS_RESOLVERS=("8.8.8.8" "1.1.1.1" "9.9.9.9" "208.67.222.222")

# TLS certificate warning threshold (days)
TLS_WARN_DAYS=14
TLS_CRITICAL_DAYS=7

# ============================================================================
# COLORS AND FORMATTING
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================================
# STATE TRACKING
# ============================================================================

CRITICAL_FAILURES=0
HIGH_FAILURES=0
WARNINGS=0
CHECKS_RUN=0
CHECKS_PASSED=0

declare -a FAILURE_MESSAGES=()
declare -a WARNING_MESSAGES=()

JSON_OUTPUT=false
CRITICAL_ONLY=false

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --critical-only)
            CRITICAL_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--json] [--critical-only]"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_header() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo ""
        echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}${BOLD}  $1${NC}"
        echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    fi
}

log_check() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "\n${BOLD}▸ $1${NC}"
    fi
}

log_pass() {
    CHECKS_RUN=$((CHECKS_RUN + 1))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "  ${GREEN}✓ PASS${NC}: $1"
    fi
}

log_fail_critical() {
    CHECKS_RUN=$((CHECKS_RUN + 1))
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    FAILURE_MESSAGES+=("[CRITICAL] $1")
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "  ${RED}✗ CRITICAL${NC}: $1"
    fi
}

log_fail_high() {
    CHECKS_RUN=$((CHECKS_RUN + 1))
    HIGH_FAILURES=$((HIGH_FAILURES + 1))
    FAILURE_MESSAGES+=("[HIGH] $1")
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "  ${RED}✗ HIGH${NC}: $1"
    fi
}

log_warn() {
    CHECKS_RUN=$((CHECKS_RUN + 1))
    WARNINGS=$((WARNINGS + 1))
    WARNING_MESSAGES+=("$1")
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "  ${YELLOW}⚠ WARN${NC}: $1"
    fi
}

log_info() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "  ${BLUE}ℹ${NC} $1"
    fi
}

dns_lookup() {
    local type=$1
    local host=$2
    local resolver=${3:-""}
    
    if [[ -n "$resolver" ]]; then
        dig +short +time=5 +tries=2 @"$resolver" "$type" "$host" 2>/dev/null
    else
        dig +short +time=5 +tries=2 "$type" "$host" 2>/dev/null
    fi
}

# ============================================================================
# CHECK FUNCTIONS
# ============================================================================

check_spf_record() {
    log_check "SPF Record at ${RETURN_PATH_HOST}"
    
    local spf_record
    spf_record=$(dns_lookup TXT "$RETURN_PATH_HOST" | grep "v=spf1" | tr -d '"' || true)
    
    if [[ -z "$spf_record" ]]; then
        log_fail_critical "SPF record MISSING at ${RETURN_PATH_HOST} - All customer emails will fail SPF!"
        return 1
    fi
    
    # Check syntax
    if [[ ! "$spf_record" =~ ^v=spf1 ]]; then
        log_fail_critical "SPF record malformed - does not start with v=spf1"
        return 1
    fi
    
    # Check termination
    if [[ ! "$spf_record" =~ (~all|-all|\?all)$ ]]; then
        log_fail_critical "SPF record missing 'all' mechanism at end"
        return 1
    fi
    
    log_pass "SPF record exists and valid"
    log_info "Value: $spf_record"
    
    # Check lookup count (warn if approaching limit)
    local include_count
    include_count=$(echo "$spf_record" | grep -o "include:" | wc -l | tr -d ' ')
    local redirect_count
    redirect_count=$(echo "$spf_record" | grep -o "redirect=" | wc -l | tr -d ' ')
    local total_lookups=$((include_count + redirect_count))
    
    if [[ $total_lookups -gt 8 ]]; then
        log_warn "SPF has $total_lookups DNS lookups - approaching 10 lookup limit"
    elif [[ $total_lookups -gt 5 ]]; then
        log_info "SPF DNS lookups: $total_lookups/10"
    fi
    
    # Verify sending IPs are included (if configured)
    if [[ ${#SENDING_IPS[@]} -gt 0 ]]; then
        for ip in "${SENDING_IPS[@]}"; do
            if [[ -n "$ip" ]] && [[ ! "$spf_record" =~ $ip ]]; then
                log_warn "Sending IP $ip may not be in SPF record (check includes)"
            fi
        done
    fi
    
    return 0
}

check_mx_record() {
    log_check "MX Record at ${RETURN_PATH_HOST}"
    
    local mx_record
    mx_record=$(dns_lookup MX "$RETURN_PATH_HOST")
    
    if [[ -z "$mx_record" ]]; then
        log_fail_critical "MX record MISSING at ${RETURN_PATH_HOST} - Bounce processing will fail!"
        return 1
    fi
    
    # Extract MX hostname (second field after priority)
    local mx_host
    mx_host=$(echo "$mx_record" | head -1 | awk '{print $2}' | sed 's/\.$//')
    
    if [[ -z "$mx_host" ]]; then
        log_fail_critical "MX record exists but cannot parse hostname"
        return 1
    fi
    
    # Verify MX target resolves
    local mx_ip
    mx_ip=$(dns_lookup A "$mx_host")
    
    if [[ -z "$mx_ip" ]]; then
        log_fail_critical "MX target $mx_host does not resolve to an IP"
        return 1
    fi
    
    log_pass "MX record exists and target resolves"
    log_info "MX: $mx_record"
    log_info "Resolves to: $mx_ip"
    
    return 0
}

check_tracking_domain() {
    log_check "Tracking Domain A Record (${TRACKING_HOST})"
    
    local tracking_ip
    tracking_ip=$(dns_lookup A "$TRACKING_HOST")
    
    if [[ -z "$tracking_ip" ]]; then
        log_fail_critical "Tracking domain ${TRACKING_HOST} has no A record - Click tracking broken!"
        return 1
    fi
    
    # If expected IP is configured, verify match
    if [[ -n "$TRACKING_IP" ]] && [[ "$tracking_ip" != "$TRACKING_IP" ]]; then
        log_fail_critical "Tracking IP mismatch: expected $TRACKING_IP, got $tracking_ip"
        return 1
    fi
    
    log_pass "Tracking domain resolves"
    log_info "IP: $tracking_ip"
    
    return 0
}

check_ptr_records() {
    if [[ ${#SENDING_IPS[@]} -eq 0 ]] || [[ -z "${SENDING_IPS[0]:-}" ]]; then
        log_check "PTR Records (Reverse DNS)"
        log_info "Skipped - no sending IPs configured"
        return 0
    fi
    
    log_check "PTR Records (Reverse DNS)"
    
    local failures=0
    
    for ip in "${SENDING_IPS[@]}"; do
        [[ -z "$ip" ]] && continue
        
        # Convert to reverse lookup format
        local reverse
        reverse=$(echo "$ip" | awk -F. '{print $4"."$3"."$2"."$1".in-addr.arpa"}')
        
        local ptr
        ptr=$(dns_lookup PTR "$reverse")
        
        if [[ -z "$ptr" ]]; then
            log_fail_critical "No PTR record for $ip - Emails will be rejected!"
            failures=$((failures + 1))
            continue
        fi
        
        # Check PTR points to our domain
        if [[ ! "$ptr" =~ \.${PLATFORM_DOMAIN}\.?$ ]]; then
            log_fail_critical "PTR for $ip does not point to ${PLATFORM_DOMAIN}: $ptr"
            failures=$((failures + 1))
            continue
        fi
        
        # Verify Forward-Confirmed rDNS (FCrDNS)
        local ptr_host="${ptr%.}"  # Remove trailing dot
        local forward_ip
        forward_ip=$(dns_lookup A "$ptr_host")
        
        if [[ "$forward_ip" != "$ip" ]]; then
            log_fail_critical "FCrDNS mismatch for $ip: PTR=$ptr resolves to $forward_ip"
            failures=$((failures + 1))
            continue
        fi
        
        log_pass "PTR valid for $ip → $ptr (FCrDNS confirmed)"
    done
    
    return $failures
}

check_mta_a_records() {
    if [[ ${#MTA_HOSTS[@]} -eq 0 ]] || [[ -z "${MTA_HOSTS[0]:-}" ]]; then
        log_check "MTA A Records"
        log_info "Skipped - no MTA hosts configured"
        return 0
    fi
    
    log_check "MTA A Records"
    
    local failures=0
    
    for mta in "${MTA_HOSTS[@]}"; do
        [[ -z "$mta" ]] && continue
        
        local mta_ip
        mta_ip=$(dns_lookup A "$mta")
        
        if [[ -z "$mta_ip" ]]; then
            log_fail_critical "MTA hostname $mta has no A record"
            failures=$((failures + 1))
        else
            log_pass "$mta → $mta_ip"
        fi
    done
    
    return $failures
}

check_platform_dmarc() {
    log_check "Platform DMARC Record (_dmarc.${PLATFORM_DOMAIN})"
    
    local dmarc_record
    dmarc_record=$(dns_lookup TXT "_dmarc.${PLATFORM_DOMAIN}" | grep "v=DMARC1" | tr -d '"' || true)
    
    if [[ -z "$dmarc_record" ]]; then
        log_warn "Platform DMARC record missing (recommended but not critical)"
        return 0
    fi
    
    log_pass "DMARC record exists"
    log_info "Value: $dmarc_record"
    
    return 0
}

check_smtp_connectivity() {
    if [[ ${#MTA_HOSTS[@]} -eq 0 ]] || [[ -z "${MTA_HOSTS[0]:-}" ]]; then
        log_check "SMTP Connectivity"
        log_info "Skipped - no MTA hosts configured"
        return 0
    fi
    
    log_check "SMTP Connectivity"
    
    local failures=0
    
    for mta in "${MTA_HOSTS[@]}"; do
        [[ -z "$mta" ]] && continue
        
        local banner
        banner=$(timeout 10 bash -c "echo 'QUIT' | nc -w 5 $mta 25 2>/dev/null" | head -1 || true)
        
        if [[ "$banner" =~ ^220 ]]; then
            log_pass "SMTP OK: $mta:25"
            
            # Check STARTTLS support
            local ehlo_response
            ehlo_response=$(timeout 10 bash -c "echo -e 'EHLO test\nQUIT' | nc -w 5 $mta 25 2>/dev/null" || true)
            
            if echo "$ehlo_response" | grep -qi "STARTTLS"; then
                log_info "STARTTLS supported"
            else
                log_warn "STARTTLS not advertised on $mta"
            fi
        else
            log_fail_critical "SMTP unreachable: $mta:25"
            failures=$((failures + 1))
        fi
    done
    
    return $failures
}

check_tracking_https() {
    log_check "Tracking Domain HTTPS (https://${TRACKING_HOST})"
    
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "https://${TRACKING_HOST}/" 2>/dev/null || echo "000")
    
    if [[ "$http_status" =~ ^[23] ]]; then
        log_pass "HTTPS responding: HTTP $http_status"
    elif [[ "$http_status" == "000" ]]; then
        log_fail_high "HTTPS connection failed (timeout or refused)"
        return 1
    else
        log_warn "HTTPS returned unexpected status: HTTP $http_status"
    fi
    
    return 0
}

check_tls_certificate() {
    log_check "TLS Certificate (${TRACKING_HOST})"
    
    local cert_info
    cert_info=$(echo | timeout 10 openssl s_client -servername "$TRACKING_HOST" -connect "${TRACKING_HOST}:443" 2>/dev/null)
    
    if [[ -z "$cert_info" ]]; then
        log_fail_high "Could not connect to check TLS certificate"
        return 1
    fi
    
    local expiry_date
    expiry_date=$(echo "$cert_info" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [[ -z "$expiry_date" ]]; then
        log_fail_high "Could not parse TLS certificate"
        return 1
    fi
    
    # Calculate days until expiry (macOS and Linux compatible)
    local expiry_epoch now_epoch days_left
    
    if date --version >/dev/null 2>&1; then
        # GNU date (Linux)
        expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
    else
        # BSD date (macOS)
        expiry_epoch=$(date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null)
    fi
    
    now_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
    
    if [[ $days_left -lt $TLS_CRITICAL_DAYS ]]; then
        log_fail_critical "TLS certificate expires in $days_left days!"
        return 1
    elif [[ $days_left -lt $TLS_WARN_DAYS ]]; then
        log_warn "TLS certificate expires in $days_left days"
    else
        log_pass "TLS certificate valid for $days_left days"
    fi
    
    # Check hostname match
    local cert_cn
    cert_cn=$(echo "$cert_info" | openssl x509 -noout -subject 2>/dev/null | grep -o "CN = [^,]*" | cut -d= -f2 | tr -d ' ')
    
    local cert_san
    cert_san=$(echo "$cert_info" | openssl x509 -noout -ext subjectAltName 2>/dev/null || true)
    
    if [[ "$cert_cn" == "$TRACKING_HOST" ]] || [[ "$cert_san" =~ $TRACKING_HOST ]]; then
        log_info "Hostname matches certificate"
    else
        log_warn "Certificate CN ($cert_cn) may not match hostname"
    fi
    
    return 0
}

check_dns_propagation() {
    log_check "DNS Propagation Consistency"
    
    local hosts=("$RETURN_PATH_HOST" "$TRACKING_HOST")
    local inconsistencies=0
    
    for host in "${hosts[@]}"; do
        local results=()
        local resolver_results=""
        
        for resolver in "${DNS_RESOLVERS[@]}"; do
            local result
            result=$(dns_lookup A "$host" "$resolver" | head -1)
            results+=("$result")
            resolver_results+="$resolver:$result "
        done
        
        # Check if all results match
        local unique_count
        unique_count=$(printf '%s\n' "${results[@]}" | sort -u | grep -v '^$' | wc -l | tr -d ' ')
        
        if [[ $unique_count -gt 1 ]]; then
            log_warn "DNS inconsistent for $host: $resolver_results"
            inconsistencies=$((inconsistencies + 1))
        elif [[ $unique_count -eq 0 ]]; then
            log_warn "No DNS results for $host across any resolver"
            inconsistencies=$((inconsistencies + 1))
        else
            log_pass "DNS consistent for $host"
        fi
    done
    
    return $inconsistencies
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "${BOLD}"
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║          KIBAMAIL INFRASTRUCTURE MONITOR                       ║"
        echo "║          Platform: ${PLATFORM_DOMAIN}                                    ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    fi
    
    # ========================================
    # CRITICAL DNS CHECKS
    # ========================================
    log_header "CRITICAL DNS CHECKS"
    
    check_spf_record
    check_mx_record
    check_tracking_domain
    check_ptr_records
    check_mta_a_records
    
    # ========================================
    # HIGH PRIORITY CHECKS
    # ========================================
    if [[ "$CRITICAL_ONLY" == "false" ]]; then
        log_header "HIGH PRIORITY CHECKS"
        
        check_platform_dmarc
        check_smtp_connectivity
        check_tracking_https
        check_tls_certificate
        
        # ========================================
        # MEDIUM PRIORITY CHECKS
        # ========================================
        log_header "MEDIUM PRIORITY CHECKS"
        
        check_dns_propagation
    fi
    
    # ========================================
    # SUMMARY
    # ========================================
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        # JSON output
        cat <<EOF
{
  "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "platform": "${PLATFORM_DOMAIN}",
  "status": "$(if [[ $CRITICAL_FAILURES -gt 0 ]]; then echo "critical"; elif [[ $HIGH_FAILURES -gt 0 ]]; then echo "high"; elif [[ $WARNINGS -gt 0 ]]; then echo "warning"; else echo "healthy"; fi)",
  "summary": {
    "checks_run": $CHECKS_RUN,
    "checks_passed": $CHECKS_PASSED,
    "critical_failures": $CRITICAL_FAILURES,
    "high_failures": $HIGH_FAILURES,
    "warnings": $WARNINGS
  },
  "failures": [$(printf '"%s",' "${FAILURE_MESSAGES[@]}" | sed 's/,$//')],
  "warnings": [$(printf '"%s",' "${WARNING_MESSAGES[@]}" | sed 's/,$//')]
}
EOF
    else
        log_header "SUMMARY"
        echo ""
        echo "  Checks Run:        $CHECKS_RUN"
        echo "  Checks Passed:     $CHECKS_PASSED"
        echo ""
        
        if [[ $CRITICAL_FAILURES -gt 0 ]]; then
            echo -e "  ${RED}${BOLD}CRITICAL FAILURES: $CRITICAL_FAILURES${NC}"
            for msg in "${FAILURE_MESSAGES[@]}"; do
                if [[ "$msg" =~ ^\[CRITICAL\] ]]; then
                    echo -e "    ${RED}• ${msg}${NC}"
                fi
            done
        fi
        
        if [[ $HIGH_FAILURES -gt 0 ]]; then
            echo -e "  ${RED}HIGH FAILURES:     $HIGH_FAILURES${NC}"
            for msg in "${FAILURE_MESSAGES[@]}"; do
                if [[ "$msg" =~ ^\[HIGH\] ]]; then
                    echo -e "    ${RED}• ${msg}${NC}"
                fi
            done
        fi
        
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "  ${YELLOW}WARNINGS:          $WARNINGS${NC}"
            for msg in "${WARNING_MESSAGES[@]}"; do
                echo -e "    ${YELLOW}• ${msg}${NC}"
            done
        fi
        
        echo ""
        
        if [[ $CRITICAL_FAILURES -gt 0 ]]; then
            echo -e "${RED}${BOLD}██ STATUS: CRITICAL - IMMEDIATE ACTION REQUIRED ██${NC}"
        elif [[ $HIGH_FAILURES -gt 0 ]]; then
            echo -e "${RED}${BOLD}██ STATUS: DEGRADED - ACTION REQUIRED ██${NC}"
        elif [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}${BOLD}██ STATUS: HEALTHY WITH WARNINGS ██${NC}"
        else
            echo -e "${GREEN}${BOLD}██ STATUS: ALL SYSTEMS HEALTHY ██${NC}"
        fi
        
        echo ""
    fi
    
    # Exit with appropriate code
    if [[ $CRITICAL_FAILURES -gt 0 ]]; then
        exit 1
    elif [[ $HIGH_FAILURES -gt 0 ]] || [[ $WARNINGS -gt 0 ]]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function
main