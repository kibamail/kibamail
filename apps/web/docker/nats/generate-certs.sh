#!/bin/bash
# Generate self-signed TLS certificates for NATS development
set -e

CERTS_DIR="$(dirname "$0")/certs"
mkdir -p "$CERTS_DIR"

# Check if certificates already exist
if [ -f "$CERTS_DIR/ca.pem" ] && [ -f "$CERTS_DIR/server.pem" ] && [ -f "$CERTS_DIR/client.pem" ]; then
    echo "Certificates already exist in $CERTS_DIR"
    exit 0
fi

echo "Generating NATS development certificates..."

# Generate CA private key
openssl genrsa -out "$CERTS_DIR/ca-key.pem" 4096

# Generate CA certificate
openssl req -new -x509 -days 3650 -key "$CERTS_DIR/ca-key.pem" -out "$CERTS_DIR/ca.pem" \
    -subj "/CN=NATS Dev CA/O=Kibamail/C=US"

# Generate server private key
openssl genrsa -out "$CERTS_DIR/server-key.pem" 4096

# Generate server CSR with SANs
cat > "$CERTS_DIR/server.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = nats-server

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = nats
DNS.3 = nats-dev
IP.1 = 127.0.0.1
EOF

openssl req -new -key "$CERTS_DIR/server-key.pem" -out "$CERTS_DIR/server.csr" \
    -config "$CERTS_DIR/server.cnf"

# Sign server certificate
openssl x509 -req -days 365 -in "$CERTS_DIR/server.csr" \
    -CA "$CERTS_DIR/ca.pem" -CAkey "$CERTS_DIR/ca-key.pem" -CAcreateserial \
    -out "$CERTS_DIR/server.pem" \
    -extensions v3_req -extfile "$CERTS_DIR/server.cnf"

# Generate client private key
openssl genrsa -out "$CERTS_DIR/client-key.pem" 4096

# Generate client CSR
openssl req -new -key "$CERTS_DIR/client-key.pem" -out "$CERTS_DIR/client.csr" \
    -subj "/CN=nats-client/O=Kibamail/C=US"

# Sign client certificate
cat > "$CERTS_DIR/client.cnf" << EOF
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = clientAuth
EOF

openssl x509 -req -days 365 -in "$CERTS_DIR/client.csr" \
    -CA "$CERTS_DIR/ca.pem" -CAkey "$CERTS_DIR/ca-key.pem" -CAcreateserial \
    -out "$CERTS_DIR/client.pem" \
    -extensions v3_req -extfile "$CERTS_DIR/client.cnf"

# Clean up CSR and CNF files
rm -f "$CERTS_DIR"/*.csr "$CERTS_DIR"/*.cnf "$CERTS_DIR"/*.srl

# Set permissions
chmod 644 "$CERTS_DIR"/*.pem
chmod 600 "$CERTS_DIR"/*-key.pem

echo "Certificates generated successfully in $CERTS_DIR"
echo "  CA:     $CERTS_DIR/ca.pem"
echo "  Server: $CERTS_DIR/server.pem, $CERTS_DIR/server-key.pem"
echo "  Client: $CERTS_DIR/client.pem, $CERTS_DIR/client-key.pem"
