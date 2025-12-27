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

# Generate kubeconfig
cat <<EOF
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

echo ""
echo "# Kubeconfig generated successfully!"
echo "# Save the above YAML to a file or use as a GitHub secret"
echo "#"
echo "# To test:"
echo "#   export KUBECONFIG=<saved-file>"
echo "#   kubectl get deployments -n kibamail-control-plane"
