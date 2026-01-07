#!/bin/bash
# =============================================================================
# Generate TLS and DKIM certificates for MTA testing
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Generating Test Certificates ==="

# Generate CA key and certificate
if [ ! -f ca.key ]; then
  echo "Generating CA key..."
  openssl genrsa -out ca.key 4096

  echo "Generating CA certificate..."
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
    -subj "/C=US/ST=Test/L=Test/O=Kibamail Test CA/CN=Kibamail Test CA" \
    -out ca.crt
fi

# Generate server key and certificate
if [ ! -f privkey.pem ]; then
  echo "Generating server key..."
  openssl genrsa -out privkey.pem 2048

  echo "Generating server CSR..."
  openssl req -new -key privkey.pem \
    -subj "/C=US/ST=Test/L=Test/O=Kibamail/CN=mail.kbmta.net" \
    -out server.csr

  # Create extensions file for SAN
  cat > server.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = mail.kbmta.net
DNS.2 = *.kbmta.net
DNS.3 = localhost
IP.1 = 172.30.0.10
IP.2 = 127.0.0.1
EOF

  echo "Generating server certificate..."
  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out cert.pem -days 365 -sha256 \
    -extfile server.ext

  # Create fullchain
  cat cert.pem ca.crt > fullchain.pem

  rm -f server.csr server.ext
fi

# Generate MTA DKIM key
mkdir -p dkim/kbmta.net
if [ ! -f dkim/kbmta.net/kbmta.key ]; then
  echo "Generating MTA DKIM key..."
  openssl genrsa -out dkim/kbmta.net/kbmta.key 2048
  openssl rsa -in dkim/kbmta.net/kbmta.key -pubout -out dkim/kbmta.net/kbmta.pub
fi

# Generate tenant DKIM keys
if [ ! -f tenant-hq-dkim-private.pem ]; then
  echo "Generating tenant DKIM keys for hq.kibamail.xyz..."
  openssl genrsa -out tenant-hq-dkim-private.pem 2048
  openssl rsa -in tenant-hq-dkim-private.pem -pubout -out tenant-hq-dkim-public.pem
fi

if [ ! -f tenant-testcustomer-dkim-private.pem ]; then
  echo "Generating tenant DKIM keys for testcustomer.com..."
  openssl genrsa -out tenant-testcustomer-dkim-private.pem 2048
  openssl rsa -in tenant-testcustomer-dkim-private.pem -pubout -out tenant-testcustomer-dkim-public.pem
fi

echo ""
echo "=== Certificates Generated ==="
echo "CA:           ca.crt, ca.key"
echo "Server:       cert.pem, privkey.pem, fullchain.pem"
echo "MTA DKIM:     dkim/kbmta.net/kbmta.key"
echo "Tenant DKIM:  tenant-*-dkim-*.pem"
echo ""
echo "Done!"
