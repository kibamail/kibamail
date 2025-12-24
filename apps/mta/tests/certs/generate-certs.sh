#!/bin/bash
# =============================================================================
# TLS Certificate Generation for KumoMTA Integration Testing
# =============================================================================
#
# This script generates:
# - A self-signed CA (Certificate Authority)
# - Server certificates for KumoMTA (mail.kbmta.net)
# - DKIM key pairs for MTA and tenant domains
#
# Usage: ./generate-certs.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Generating TLS Certificates for Integration Testing ==="

# Certificate validity (days)
DAYS=365

# Key sizes
RSA_BITS=2048
DKIM_BITS=1024

# =============================================================================
# 1. Generate CA (Certificate Authority)
# =============================================================================

echo ">>> Generating CA certificate..."

# CA private key
openssl genrsa -out ca.key $RSA_BITS 2>/dev/null

# CA certificate
openssl req -x509 -new -nodes \
  -key ca.key \
  -sha256 \
  -days $DAYS \
  -out ca.crt \
  -subj "/C=US/ST=California/L=San Francisco/O=Kibamail Test CA/CN=Kibamail Test CA"

echo "    Created: ca.key, ca.crt"

# =============================================================================
# 2. Generate KumoMTA Server Certificate
# =============================================================================

echo ">>> Generating KumoMTA server certificate..."

# Create config for SAN (Subject Alternative Names)
cat > mail.kbmta.net.cnf << EOF
[req]
default_bits = $RSA_BITS
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = US
ST = California
L = San Francisco
O = Kibamail
OU = MTA
CN = mail.kbmta.net

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = mail.kbmta.net
DNS.2 = mta.kbmta.net
DNS.3 = dmarc.kbmta.net
DNS.4 = *.kbmta.net
DNS.5 = localhost
DNS.6 = smtp.test.local
IP.1 = 172.28.0.3
IP.2 = 127.0.0.1
IP.3 = 172.28.0.5
EOF

# Generate private key
openssl genrsa -out privkey.pem $RSA_BITS 2>/dev/null

# Generate CSR
openssl req -new \
  -key privkey.pem \
  -out mail.kbmta.net.csr \
  -config mail.kbmta.net.cnf

# Sign with CA
openssl x509 -req \
  -in mail.kbmta.net.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out cert.pem \
  -days $DAYS \
  -sha256 \
  -extensions req_ext \
  -extfile mail.kbmta.net.cnf

# Create fullchain (cert + CA)
cat cert.pem ca.crt > fullchain.pem

echo "    Created: privkey.pem, cert.pem, fullchain.pem"

# =============================================================================
# 3. Generate DKIM Keys for MTA
# =============================================================================

echo ">>> Generating MTA DKIM key pair..."

# MTA DKIM key (for kbmta._domainkey.kbmta.net)
openssl genrsa -out mta-dkim-private.pem $DKIM_BITS 2>/dev/null
openssl rsa -in mta-dkim-private.pem -pubout -out mta-dkim-public.pem 2>/dev/null

# Extract public key for DNS TXT record (base64, single line)
MTA_DKIM_PUBLIC=$(grep -v "^-" mta-dkim-public.pem | tr -d '\n')

echo "    Created: mta-dkim-private.pem, mta-dkim-public.pem"
echo "    DNS Record: kbmta._domainkey.kbmta.net TXT \"v=DKIM1; k=rsa; p=$MTA_DKIM_PUBLIC\""

# =============================================================================
# 4. Generate DKIM Keys for Test Tenant Domains
# =============================================================================

echo ">>> Generating tenant DKIM key pairs..."

# Tenant domain 1: hq.kibamail.xyz
openssl genrsa -out tenant-hq-dkim-private.pem $DKIM_BITS 2>/dev/null
openssl rsa -in tenant-hq-dkim-private.pem -pubout -out tenant-hq-dkim-public.pem 2>/dev/null

TENANT_HQ_DKIM_PUBLIC=$(grep -v "^-" tenant-hq-dkim-public.pem | tr -d '\n')

echo "    Created: tenant-hq-dkim-private.pem, tenant-hq-dkim-public.pem"
echo "    DNS Record: kibamail._domainkey.hq.kibamail.xyz TXT \"v=DKIM1; k=rsa; p=$TENANT_HQ_DKIM_PUBLIC\""

# Tenant domain 2: testcustomer.com
openssl genrsa -out tenant-testcustomer-dkim-private.pem $DKIM_BITS 2>/dev/null
openssl rsa -in tenant-testcustomer-dkim-private.pem -pubout -out tenant-testcustomer-dkim-public.pem 2>/dev/null

TENANT_TC_DKIM_PUBLIC=$(grep -v "^-" tenant-testcustomer-dkim-public.pem | tr -d '\n')

echo "    Created: tenant-testcustomer-dkim-private.pem, tenant-testcustomer-dkim-public.pem"
echo "    DNS Record: kibamail._domainkey.testcustomer.com TXT \"v=DKIM1; k=rsa; p=$TENANT_TC_DKIM_PUBLIC\""

# =============================================================================
# 5. Create DKIM Data TOML for KumoMTA
# =============================================================================

echo ">>> Creating dkim_data.toml..."

cat > dkim_data.toml << EOF
# =============================================================================
# DKIM Signing Configuration for MTA (kbmta.net)
# =============================================================================
#
# This file configures the MTA-level DKIM signature.
# Tenant DKIM signing is handled via email agent API.
#

[domain."kbmta.net"]
selector = "kbmta"
filename = "/opt/kumomta/etc/tls/mta-dkim-private.pem"
headers = ["From", "To", "Subject", "Date", "Message-ID", "Content-Type", "MIME-Version"]
over_sign = true
EOF

echo "    Created: dkim_data.toml"

# =============================================================================
# 6. Create DNS Update File
# =============================================================================

echo ">>> Creating dns_records.txt with DKIM public keys..."

cat > dns_records.txt << EOF
# =============================================================================
# DNS TXT Records for DKIM
# =============================================================================
# Copy these to your DNS configuration (dnsmasq.conf for testing)

# MTA DKIM
txt-record=kbmta._domainkey.kbmta.net,"v=DKIM1; k=rsa; p=$MTA_DKIM_PUBLIC"

# Tenant: hq.kibamail.xyz
txt-record=kibamail._domainkey.hq.kibamail.xyz,"v=DKIM1; k=rsa; p=$TENANT_HQ_DKIM_PUBLIC"

# Tenant: testcustomer.com
txt-record=kibamail._domainkey.testcustomer.com,"v=DKIM1; k=rsa; p=$TENANT_TC_DKIM_PUBLIC"
EOF

echo "    Created: dns_records.txt"

# =============================================================================
# 7. Set Permissions
# =============================================================================

echo ">>> Setting file permissions..."

chmod 644 *.crt *.pem ca.srl 2>/dev/null || true
chmod 644 dkim_data.toml dns_records.txt
chmod 600 *.key *-private.pem 2>/dev/null || true

# =============================================================================
# 8. Cleanup
# =============================================================================

echo ">>> Cleaning up temporary files..."

rm -f *.csr *.cnf *.srl 2>/dev/null || true

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=== Certificate Generation Complete ==="
echo ""
echo "Files created:"
echo "  CA:           ca.key, ca.crt"
echo "  TLS:          privkey.pem, cert.pem, fullchain.pem"
echo "  MTA DKIM:     mta-dkim-private.pem, mta-dkim-public.pem"
echo "  Tenant DKIM:  tenant-hq-dkim-private.pem, tenant-testcustomer-dkim-private.pem"
echo "  Config:       dkim_data.toml, dns_records.txt"
echo ""
echo "IMPORTANT: Update dns/dnsmasq.conf with records from dns_records.txt"
echo ""
