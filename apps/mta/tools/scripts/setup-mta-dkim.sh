#!/bin/bash
#
# Setup DKIM keys for MTA signing domain
#
# This script generates DKIM keys for the MTA's own signing domain (kbmta.net)
# Used for the MTA-level DKIM signature (second signature in 2-fold signing)
#
# Usage:
#   ./setup-mta-dkim.sh
#
# Environment variables (optional):
#   MTA_DKIM_DOMAIN   - Domain for MTA signing (default: kbmta.net)
#   MTA_DKIM_SELECTOR - DKIM selector (default: kbmta)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
MTA_DKIM_DOMAIN="${MTA_DKIM_DOMAIN:-kbmta.net}"
MTA_DKIM_SELECTOR="${MTA_DKIM_SELECTOR:-kbmta}"

echo "Setting up MTA DKIM keys..."
echo ""
echo "Domain:   ${MTA_DKIM_DOMAIN}"
echo "Selector: ${MTA_DKIM_SELECTOR}"
echo ""

# Run the generate script
"${SCRIPT_DIR}/generate-dkim.sh" "$MTA_DKIM_DOMAIN" "$MTA_DKIM_SELECTOR"

echo ""
echo "========================================="
echo "  MTA DKIM Setup Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Add the DNS TXT record shown above to your DNS provider"
echo ""
echo "2. Verify the record is published:"
echo "   dig +short TXT ${MTA_DKIM_SELECTOR}._domainkey.${MTA_DKIM_DOMAIN}"
echo ""
echo "3. Update your environment variables to match:"
echo "   MTA_DKIM_DOMAIN=${MTA_DKIM_DOMAIN}"
echo "   MTA_DKIM_SELECTOR=${MTA_DKIM_SELECTOR}"
echo ""
echo "4. Restart KumoMTA to pick up the new keys"
echo ""
