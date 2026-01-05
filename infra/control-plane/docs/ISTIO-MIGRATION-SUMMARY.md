# Istio Gateway Migration Summary

This document summarizes the migration from Cilium Gateway API to Istio Gateway API due to Cilium's hostNetwork bugs (GitHub issue #42786).

## Problem

Cilium Gateway API with `hostNetwork.enabled: true` has a regression bug in versions 1.18.3+ that causes:
- Gateway status stuck at `PROGRAMMED: False` with `AddressNotAssigned`
- HTTP listeners not working while TLS passthrough works
- The bug affects L7 (HTTP) listeners differently than L4 (TLS passthrough)

## Solution

Use Cilium for CNI only (pod networking) and Istio for Gateway API.

```
+-------------------------------------+
|  Istio (Gateway API only)           |
|  - Manages Gateway resources        |
|  - Creates managed gateway pods     |
|  - hostNetwork on ports 30080/30443 |
+-------------------------------------+
|  Cilium (CNI only)                  |
|  - Pod networking                   |
|  - Network policies                 |
|  - NO Gateway API                   |
+-------------------------------------+
```

## Files Created/Modified

### New Files

1. **`infra/control-plane/docs/ISTIO-GATEWAY-SETUP.md`**
   - Complete step-by-step guide for setting up Istio Gateway API
   - Troubleshooting section
   - Load balancer configuration notes

2. **`infra/control-plane/cli/internal/installer/istio.go`**
   - New installer for Istio Gateway API controller
   - Minimal profile, no sidecars
   - Gateway API enabled via pilot env vars

### Modified Files

1. **`infra/control-plane/cli/internal/installer/cilium.go`**
   - Disabled Gateway API (`gatewayAPI.enabled: false`)
   - Updated comments to reflect CNI-only role

2. **`infra/control-plane/cli/cmd/install.go`**
   - Added `--skip-istio` flag
   - Added Istio to components list (after Cilium)
   - Updated command documentation

3. **`infra/control-plane/clusters/base/ingress/gateway.yaml`**
   - Changed `gatewayClassName: cilium` to `gatewayClassName: istio`
   - Added ConfigMap for hostNetwork + sysctls fix
   - Added `infrastructure.parametersRef`

## Installation Order for New Clusters

```bash
# 1. Run CLI installer (includes Cilium + Istio)
./kibamail-cli install --kubeconfig=/path/to/kubeconfig

# 2. Apply kustomize manifests (includes Gateway with Istio class)
kubectl apply -k infra/control-plane/clusters/overlays/production
```

## Manual Migration Steps (Existing Clusters)

### Step 1: Disable Cilium Gateway API

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set gatewayAPI.enabled=false \
  --set gatewayAPI.hostNetwork.enabled=false
```

### Step 2: Restart Cilium to Release Ports

```bash
kubectl rollout restart daemonset/cilium-envoy -n kube-system
kubectl rollout restart daemonset/cilium -n kube-system

# Wait for rollout
kubectl rollout status daemonset/cilium -n kube-system
kubectl rollout status daemonset/cilium-envoy -n kube-system
```

### Step 3: Install Istio

Create config file:

```bash
cat << 'EOF' > /tmp/istio-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gateway-only
spec:
  profile: minimal
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    pilot:
      enabled: true
    ingressGateways: []
  values:
    global:
      proxy:
        autoInject: disabled
    pilot:
      env:
        PILOT_ENABLE_GATEWAY_API: "true"
        PILOT_ENABLE_GATEWAY_API_STATUS: "true"
        PILOT_ENABLE_ALPHA_GATEWAY_API: "true"
EOF
```

Install:

```bash
istioctl install -f /tmp/istio-config.yaml --skip-confirmation
```

Verify:

```bash
kubectl get pods -n istio-system
kubectl get gatewayclass
```

### Step 4: Apply Updated Gateway Manifests

```bash
kubectl apply -k infra/control-plane/clusters/overlays/production
# or for staging:
kubectl apply -k infra/control-plane/clusters/overlays/staging
```

### Step 5: Verify Gateway Status

```bash
kubectl get gateway kibamail-gateway
# Should show PROGRAMMED: True

kubectl get pods -l gateway.networking.k8s.io/gateway-name=kibamail-gateway
# Should show 1/1 Running

kubectl logs -l gateway.networking.k8s.io/gateway-name=kibamail-gateway --tail=10
# Should show "Envoy proxy is ready"
```

## Gateway ConfigMap for hostNetwork

The Gateway requires a ConfigMap to configure hostNetwork (Istio's default template has sysctls incompatible with hostNetwork):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kibamail-gateway-config
data:
  deployment: |
    spec:
      template:
        spec:
          hostNetwork: true
          dnsPolicy: ClusterFirstWithHostNet
          securityContext:
            sysctls: []
  service: |
    spec:
      type: ClusterIP
```

The Gateway references this via:

```yaml
spec:
  gatewayClassName: istio
  infrastructure:
    parametersRef:
      group: ""
      kind: ConfigMap
      name: kibamail-gateway-config
```

## Troubleshooting

### Gateway pod in CrashLoopBackOff with "Address already in use"

Another process is using ports 30080/30443 (likely old Cilium envoy):

```bash
kubectl rollout restart daemonset/cilium-envoy -n kube-system
kubectl delete pod -l gateway.networking.k8s.io/gateway-name=kibamail-gateway
```

### LDS updates rejected

Check istiod logs for the actual error:

```bash
kubectl logs -n istio-system deployment/istiod --tail=50 | grep -i error
```

### sysctls error with hostNetwork

Ensure ConfigMap includes `securityContext: sysctls: []`

## Load Balancer Configuration

With hostNetwork mode, gateway pods bind directly to node ports:
- HTTP: 30080
- HTTPS: 30443

Configure external load balancer (e.g., Hetzner) to:
1. Health check on port 30080 (HTTP) - expects 301 redirect
2. Forward port 80 → node:30080
3. Forward port 443 → node:30443 (TCP passthrough, not HTTP)

## References

- [Cilium hostNetwork Bug #42786](https://github.com/cilium/cilium/issues/42786)
- [Istio Gateway API Documentation](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/)
- [Gateway API Specification](https://gateway-api.sigs.k8s.io/)
