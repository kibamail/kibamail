#!/bin/bash
#
# Generate kubeconfig for github-deployer service account
#
# Usage:
#   ./get-deployer-kubeconfig.sh [KUBECONFIG] [SERVER_URL]
#
# Arguments:
#   KUBECONFIG  - Path to admin kubeconfig (default: uses current context)
#   SERVER_URL  - Kubernetes API server URL (default: extracted from current config)
#
# Example:
#   ./get-deployer-kubeconfig.sh ./kubeconfig.yaml https://77.42.35.131:6443
#

set -euo pipefail

NAMESPACE="kibamail-deployments"
SERVICE_ACCOUNT="github-deployer"
SECRET_NAME="github-deployer-token"

# Use provided kubeconfig or default
if [ -n "${1:-}" ]; then
    export KUBECONFIG="$1"
fi

# Get server URL from argument or extract from current config
if [ -n "${2:-}" ]; then
    SERVER="$2"
else
    SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
fi

echo "Generating kubeconfig for $SERVICE_ACCOUNT..."
echo "Server: $SERVER"
echo ""

# Wait for token to be populated
echo "Waiting for service account token..."
for i in {1..30}; do
    TOKEN=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.token}' 2>/dev/null | base64 -d) || true
    if [ -n "$TOKEN" ]; then
        break
    fi
    sleep 1
done

if [ -z "$TOKEN" ]; then
    echo "Error: Could not retrieve token from secret $SECRET_NAME"
    echo "Make sure the service account and secret exist:"
    echo "  kubectl get sa $SERVICE_ACCOUNT -n $NAMESPACE"
    echo "  kubectl get secret $SECRET_NAME -n $NAMESPACE"
    exit 1
fi

# Get CA certificate
CA_CERT=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}')

if [ -z "$CA_CERT" ]; then
    echo "Error: Could not retrieve CA certificate from secret"
    exit 1
fi

# Generate kubeconfig YAML
KUBECONFIG_YAML=$(cat <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: kibamail-cluster
    cluster:
      server: $SERVER
      certificate-authority-data: $CA_CERT
contexts:
  - name: github-deployer
    context:
      cluster: kibamail-cluster
      user: github-deployer
current-context: github-deployer
users:
  - name: github-deployer
    user:
      token: $TOKEN
EOF
)

# Generate base64 encoded version (works on both macOS and Linux)
if command -v base64 &> /dev/null; then
    # Check if we're on macOS (BSD base64) or Linux (GNU base64)
    if base64 --version 2>&1 | grep -q "GNU"; then
        KUBECONFIG_BASE64=$(echo "$KUBECONFIG_YAML" | base64 -w0)
    else
        KUBECONFIG_BASE64=$(echo "$KUBECONFIG_YAML" | base64)
    fi
fi

# Output plain YAML
echo "================================================================================"
echo "PLAIN KUBECONFIG (save to file for local use)"
echo "================================================================================"
echo ""
echo "$KUBECONFIG_YAML"
echo ""

# Output base64 encoded
echo "================================================================================"
echo "BASE64 ENCODED (copy this for GitHub Secrets: KUBE_CONFIG_STAGING)"
echo "================================================================================"
echo ""
echo "$KUBECONFIG_BASE64"
echo ""

# Instructions
echo "================================================================================"
echo "INSTRUCTIONS"
echo "================================================================================"
echo ""
echo "For local use:"
echo "  1. Copy the PLAIN KUBECONFIG above"
echo "  2. Save to a file: ~/.kube/deployer-config"
echo "  3. Test: KUBECONFIG=~/.kube/deployer-config kubectl get deployments -A"
echo ""
echo "For GitHub Actions:"
echo "  1. Copy the BASE64 ENCODED string above"
echo "  2. Go to GitHub repo -> Settings -> Secrets -> Actions"
echo "  3. Create secret named: KUBE_CONFIG_STAGING"
echo "  4. Paste the base64 string as the value"
echo ""
