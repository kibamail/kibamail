#!/bin/bash
#
# Generate DKIM keys for KumoMTA
#
# Usage:
#   ./generate-dkim.sh <domain> <selector>
#
# Example:
#   ./generate-dkim.sh kbmta.net kbmta
#
# This will create:
#   - /opt/kumomta/etc/dkim/<domain>/<selector>.key (private key)
#   - /opt/kumomta/etc/dkim/<domain>/<selector>.pub (public key)
#   - Outputs the DNS TXT record to add
#

set -euo pipefail

DKIM_BASE_DIR="/opt/kumomta/etc/dkim"
KEY_SIZE=2048

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <domain> <selector>"
    echo ""
    echo "Arguments:"
    echo "  domain    The domain to generate DKIM keys for (e.g., kbmta.net)"
    echo "  selector  The DKIM selector (e.g., kbmta, k1, default)"
    echo ""
    echo "Example:"
    echo "  $0 kbmta.net kbmta"
    exit 1
}

if [ $# -ne 2 ]; then
    usage
fi

DOMAIN="$1"
SELECTOR="$2"

DOMAIN_DIR="${DKIM_BASE_DIR}/${DOMAIN}"
PRIVATE_KEY="${DOMAIN_DIR}/${SELECTOR}.key"
PUBLIC_KEY="${DOMAIN_DIR}/${SELECTOR}.pub"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DKIM Key Generator for KumoMTA${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Domain:   ${GREEN}${DOMAIN}${NC}"
echo -e "Selector: ${GREEN}${SELECTOR}${NC}"
echo -e "Key Size: ${GREEN}${KEY_SIZE} bits${NC}"
echo ""

# Check if keys already exist
if [ -f "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}Warning: Private key already exists at ${PRIVATE_KEY}${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create directory
echo -e "${BLUE}Creating directory ${DOMAIN_DIR}...${NC}"
mkdir -p "$DOMAIN_DIR"

# Generate private key
echo -e "${BLUE}Generating ${KEY_SIZE}-bit RSA private key...${NC}"
openssl genrsa -f4 -out "$PRIVATE_KEY" "$KEY_SIZE" 2>/dev/null

# Extract public key
echo -e "${BLUE}Extracting public key...${NC}"
openssl rsa -in "$PRIVATE_KEY" -outform PEM -pubout -out "$PUBLIC_KEY" 2>/dev/null

# Set permissions
echo -e "${BLUE}Setting permissions...${NC}"
chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

# Check if kumod user exists and set ownership
if id "kumod" &>/dev/null; then
    chown kumod:kumod "$PRIVATE_KEY" "$PUBLIC_KEY"
    chown kumod:kumod "$DOMAIN_DIR"
fi

# Extract public key for DNS record (remove headers and newlines)
PUBLIC_KEY_DATA=$(grep -v '^-' "$PUBLIC_KEY" | tr -d '\n')

# Generate DNS record
DNS_HOSTNAME="${SELECTOR}._domainkey.${DOMAIN}"
DNS_VALUE="v=DKIM1; k=rsa; h=sha256; p=${PUBLIC_KEY_DATA}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DKIM Keys Generated Successfully${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Files created:${NC}"
echo "  Private Key: ${PRIVATE_KEY}"
echo "  Public Key:  ${PUBLIC_KEY}"
echo ""
echo -e "${BLUE}DNS Record to add:${NC}"
echo ""
echo -e "${YELLOW}Hostname:${NC}"
echo "  ${DNS_HOSTNAME}"
echo ""
echo -e "${YELLOW}Record Type:${NC}"
echo "  TXT"
echo ""
echo -e "${YELLOW}Value:${NC}"
echo "  ${DNS_VALUE}"
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}Bind Zone File Format:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""
echo "${DNS_HOSTNAME}. 86400 IN TXT \"${DNS_VALUE}\""
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}Verification Command:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""
echo "dig +short TXT ${DNS_HOSTNAME}"
echo ""
