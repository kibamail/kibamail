# Istio Gateway API Setup Guide

This document describes how to set up Istio as the Gateway API implementation for Kibamail clusters, replacing Cilium's Gateway API (which has known bugs with hostNetwork mode).

## Architecture

```
┌─────────────────────────────────────┐
│  Istio (Gateway API only)           │
│  - Manages Gateway resources        │
│  - Creates managed gateway pods     │
│  - hostNetwork on ports 30080/30443 │
├─────────────────────────────────────┤
│  Cilium (CNI only)                  │
│  - Pod networking                   │
│  - Network policies                 │
│  - NO Gateway API                   │
└─────────────────────────────────────┘
```

## Prerequisites

- Kubernetes cluster with Cilium CNI installed
- `kubectl` configured to access the cluster
- `istioctl` installed (v1.28+)
- `helm` installed

## Step 1: Disable Cilium Gateway API

Cilium's Gateway API has bugs with hostNetwork mode (see GitHub issue #42786). Disable it:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set gatewayAPI.enabled=false \
  --set gatewayAPI.hostNetwork.enabled=false
```

Then restart Cilium to release any bound ports:

```bash
kubectl rollout restart daemonset/cilium-envoy -n kube-system
kubectl rollout restart daemonset/cilium -n kube-system
```

Wait for Cilium pods to be ready:

```bash
kubectl rollout status daemonset/cilium -n kube-system
kubectl rollout status daemonset/cilium-envoy -n kube-system
```

## Step 2: Install Istio

Create the Istio configuration file:

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
    # We don't install the default ingressGateway
    # Istio will create managed gateways per Gateway resource
    ingressGateways: []
  values:
    global:
      proxy:
        autoInject: disabled  # No sidecar injection
    pilot:
      env:
        PILOT_ENABLE_GATEWAY_API: "true"
        PILOT_ENABLE_GATEWAY_API_STATUS: "true"
        PILOT_ENABLE_ALPHA_GATEWAY_API: "true"
EOF
```

Install Istio:

```bash
istioctl install -f /tmp/istio-config.yaml --skip-confirmation
```

Verify installation:

```bash
kubectl get pods -n istio-system
kubectl get gatewayclass
```

Expected output:
```
NAME           CONTROLLER                    ACCEPTED   AGE
istio          istio.io/gateway-controller   True       1m
istio-remote   istio.io/unmanaged-gateway    True       1m
```

## Step 3: Configure Gateway Manifest

The Gateway manifest needs:
1. `gatewayClassName: istio`
2. A ConfigMap for hostNetwork configuration (Istio's default template has sysctls incompatible with hostNetwork)
3. `infrastructure.parametersRef` to reference the ConfigMap

Example `gateway.yaml`:

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
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: kibamail-gateway
  annotations:
    networking.istio.io/service-type: ClusterIP
spec:
  gatewayClassName: istio
  infrastructure:
    parametersRef:
      group: ""
      kind: ConfigMap
      name: kibamail-gateway-config
  listeners:
    # HTTP listener for ACME challenges and redirects
    - name: http
      protocol: HTTP
      port: 30080
      allowedRoutes:
        namespaces:
          from: All

    # TLS Passthrough listeners
    - name: tls-kibamail
      protocol: TLS
      port: 30443
      hostname: "*.kibamail.com"
      tls:
        mode: Passthrough
      allowedRoutes:
        namespaces:
          from: All
        kinds:
          - kind: TLSRoute

    # Add more TLS listeners as needed...
```

## Step 4: Apply and Verify

Apply the Gateway:

```bash
kubectl apply -f gateway.yaml
```

Wait for the managed gateway pod to be created and become ready:

```bash
kubectl get pods -n default -l gateway.networking.k8s.io/gateway-name=kibamail-gateway -w
```

Check Gateway status:

```bash
kubectl get gateway kibamail-gateway
```

Expected output:
```
NAME               CLASS   ADDRESS                                            PROGRAMMED   AGE
kibamail-gateway   istio   kibamail-gateway-istio.default.svc.cluster.local   True         1m
```

Verify hostNetwork is enabled:

```bash
kubectl get pod -l gateway.networking.k8s.io/gateway-name=kibamail-gateway \
  -o jsonpath='{.items[0].spec.hostNetwork}'
# Should output: true
```

## Troubleshooting

### Gateway pod in CrashLoopBackOff

**Symptom:** Pod crashes with "Address already in use" errors.

**Cause:** Another process is using ports 30080/30443 on the node (likely old Cilium envoy).

**Fix:**
```bash
kubectl rollout restart daemonset/cilium-envoy -n kube-system
kubectl delete pod -l gateway.networking.k8s.io/gateway-name=kibamail-gateway
```

### LDS updates rejected

**Symptom:** Logs show "lds updates: 0 successful, 1 rejected"

**Cause:** Usually port binding issues or invalid listener configuration.

**Debug:**
```bash
kubectl logs -n default deployment/kibamail-gateway-istio --tail=50
kubectl logs -n istio-system deployment/istiod --tail=50 | grep -i error
```

### sysctls error with hostNetwork

**Symptom:** Error "may not be specified when 'hostNetwork' is true"

**Cause:** Istio's default template sets `net.ipv4.ip_unprivileged_port_start` sysctl.

**Fix:** Ensure ConfigMap includes `securityContext: sysctls: []`

## Clean Up Old Resources

After migration, clean up Cilium gateway resources:

```bash
# Delete old Cilium gateway services (if any)
kubectl delete svc -l io.cilium.gateway/owning-gateway

# Verify no Cilium gateway resources remain
kubectl get svc -A | grep cilium-gateway
```

## Load Balancer Configuration

With hostNetwork mode, the gateway pods bind directly to node ports:
- HTTP: 30080
- HTTPS: 30443

Configure your external load balancer (e.g., Hetzner) to:
1. Health check on port 30080 (HTTP)
2. Forward port 80 → node:30080
3. Forward port 443 → node:30443 (TCP passthrough, not HTTP)
