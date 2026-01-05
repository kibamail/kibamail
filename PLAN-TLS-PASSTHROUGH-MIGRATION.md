# TLS Passthrough Migration Plan

## Overview

Migrate from Gateway-level TLS Termination to TLS Passthrough with nginx sidecars handling SSL termination at the service level. This enables dynamic certificate serving for customer tracking domains.

---

## Current State

```
Client → Gateway (TLS Terminate with kibamail-tls cert)
              ↓
         HTTPRoute (path-based routing)
              ↓
    ┌─────────┴─────────┬────────────────┐
    ↓                   ↓                ↓
control-plane:80   marketing:80   tracking:3100
```

**Problem:** Customer domains (e.g., `e.newsletter.katifrantz.com`) get `kibamail.com` certificate because Gateway terminates TLS before routing, and SNI doesn't match `e.kbmta.net`.

---

## Target State

```
Client → Gateway (TLS Passthrough - routes by SNI only)
              ↓
         TLSRoute (hostname-based routing)
              ↓
    ┌─────────┴─────────┬─────────────┬─────────────┐
    ↓                   ↓             ↓             ↓
kibamail:443       api:443       logto:443    tracking:443
(nginx sidecar)   (nginx)       (nginx)      (openresty)
    ↓                   ↓             ↓             ↓
path routing      api:3000      logto:3001   tracking:3100
    ↓                             logto:3002
┌───┴───┐
↓       ↓
cp:3000 mkt:80
```

---

## Services Inventory

| Service | Domain(s) | Certificate | Current State | Target State |
|---------|-----------|-------------|---------------|--------------|
| kibamail-web | `kibamail.com`, `www.kibamail.com`, `api.kibamail.com` | `kibamail-tls` | control-plane:80 + marketing:80 + api:3000 (all separate) | Consolidated pod with nginx sidecar |
| logto | `auth.kibamail.com`, `admin.auth.kibamail.com` | `logto-tls` | logto:3001/3002 (no sidecar) | nginx sidecar with SNI routing |
| kibamail-tracking | Customer domains + `e.kbmta.net` | Dynamic + `tracking-tls` | openresty:443 ✓ | No changes needed |

**Note:** `kibamail-api` is being consolidated into `kibamail-web` since it's the same Next.js codebase. The nginx sidecar will route `api.kibamail.com` to the control-plane container.

---

## Phase 1: Prepare nginx TLS Configurations

### 1.1 Create nginx TLS ConfigMap for kibamail-web

**File:** `infra/control-plane/clusters/base/kibamail/nginx-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kibamail-web-nginx
  namespace: kibamail
data:
  nginx.conf: |
    worker_processes auto;
    error_log /dev/stderr warn;
    pid /tmp/nginx.pid;

    events {
        worker_connections 1024;
        use epoll;
        multi_accept on;
    }

    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';

        access_log /dev/stdout main;

        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        keepalive_timeout 65;
        types_hash_max_size 2048;

        gzip on;
        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

        # Upstreams
        upstream control_plane {
            server 127.0.0.1:3000;
            keepalive 32;
        }

        upstream marketing {
            server 127.0.0.1:3001;
            keepalive 16;
        }

        # HTTPS Server for api.kibamail.com
        # All traffic goes directly to control-plane
        server {
            listen 443 ssl;
            server_name api.kibamail.com api.staging.kibamail.com;

            ssl_certificate /etc/ssl/certs/tls.crt;
            ssl_certificate_key /etc/ssl/certs/tls.key;

            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
            ssl_prefer_server_ciphers on;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;
            ssl_session_tickets off;

            add_header X-Content-Type-Options nosniff always;
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

            # Rewrite root to /api for api.kibamail.com
            location / {
                rewrite ^/(.*)$ /api/$1 break;
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }
        }

        # HTTPS Server for kibamail.com and www.kibamail.com
        # Path-based routing between control-plane and marketing
        server {
            listen 443 ssl default_server;
            server_name kibamail.com www.kibamail.com staging.kibamail.com www.staging.kibamail.com;

            ssl_certificate /etc/ssl/certs/tls.crt;
            ssl_certificate_key /etc/ssl/certs/tls.key;

            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
            ssl_prefer_server_ciphers on;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;
            ssl_session_tickets off;

            add_header X-Content-Type-Options nosniff always;
            add_header X-Frame-Options DENY always;
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

            # Control plane routes (specific paths)
            location /w {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /_kibamail-control-plane {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /api {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /healthz {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /p {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /callback {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;
            }

            location /_next {
                proxy_pass http://control_plane;
                include /etc/nginx/proxy_params.conf;

                # Cache static assets
                proxy_cache_valid 200 365d;
                expires 365d;
                add_header Cache-Control "public, max-age=31536000, immutable";
            }

            # Marketing (default route)
            location / {
                proxy_pass http://marketing;
                include /etc/nginx/proxy_params.conf;
            }

            # Health check
            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }
        }

        # HTTP to HTTPS redirect
        server {
            listen 80;
            server_name _;

            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }

            location / {
                return 301 https://$host$request_uri;
            }
        }
    }

  proxy_params.conf: |
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header Connection "";
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
```

### 1.2 Create nginx TLS ConfigMap for logto

**File:** `infra/control-plane/clusters/base/logto/nginx-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logto-nginx
  namespace: logto
data:
  nginx.conf: |
    worker_processes auto;
    error_log /dev/stderr warn;
    pid /tmp/nginx.pid;

    events {
        worker_connections 1024;
        use epoll;
        multi_accept on;
    }

    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent"';

        access_log /dev/stdout main;

        keepalive_timeout 65;

        # Map SNI hostname to upstream port
        map $ssl_server_name $logto_port {
            ~^admin\.auth\. 3002;
            default         3001;
        }

        upstream logto_main {
            server 127.0.0.1:3001;
            keepalive 16;
        }

        upstream logto_admin {
            server 127.0.0.1:3002;
            keepalive 16;
        }

        # HTTPS Server for auth.kibamail.com
        server {
            listen 443 ssl;
            server_name auth.kibamail.com auth.staging.kibamail.com;

            ssl_certificate /etc/ssl/certs/tls.crt;
            ssl_certificate_key /etc/ssl/certs/tls.key;

            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
            ssl_prefer_server_ciphers on;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;
            ssl_session_tickets off;

            add_header X-Content-Type-Options nosniff always;
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

            location / {
                proxy_pass http://logto_main;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_set_header X-Forwarded-Host $host;
                proxy_set_header Connection "";
            }

            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }
        }

        # HTTPS Server for admin.auth.kibamail.com
        server {
            listen 443 ssl;
            server_name admin.auth.kibamail.com admin.auth.staging.kibamail.com;

            ssl_certificate /etc/ssl/certs/tls.crt;
            ssl_certificate_key /etc/ssl/certs/tls.key;

            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
            ssl_prefer_server_ciphers on;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;
            ssl_session_tickets off;

            add_header X-Content-Type-Options nosniff always;
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

            location / {
                proxy_pass http://logto_admin;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_set_header X-Forwarded-Host $host;
                proxy_set_header Connection "";
            }

            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }
        }

        # HTTP redirect
        server {
            listen 80;
            server_name _;

            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }

            location / {
                return 301 https://$host$request_uri;
            }
        }
    }
```

---

## Phase 2: Create New Namespace and Consolidated Deployment

### 2.1 Create kibamail namespace

**File:** `infra/control-plane/clusters/base/kibamail/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kibamail
  labels:
    app.kubernetes.io/part-of: kibamail
```

### 2.2 Create consolidated kibamail-web deployment

**File:** `infra/control-plane/clusters/base/kibamail/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibamail-web
  namespace: kibamail
  labels:
    app.kubernetes.io/name: kibamail-web
    app.kubernetes.io/component: web
    app.kubernetes.io/part-of: kibamail
  annotations:
    secrets.infisical.com/auto-reload: "true"
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: kibamail-web
  template:
    metadata:
      labels:
        app.kubernetes.io/name: kibamail-web
        app.kubernetes.io/component: web
        app.kubernetes.io/part-of: kibamail
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/name: kibamail-web
                topologyKey: kubernetes.io/hostname
      initContainers:
        - name: migrations
          image: ghcr.io/kibamail/kibamail:staging-cli
          imagePullPolicy: Always
          command: ["sh", "-c"]
          args:
            - |
              echo "Checking for pending migrations..."
              PENDING=$(pnpm exec prisma migrate status 2>&1 | grep -c "Following migration" || true)
              if [ "$PENDING" -gt 0 ]; then
                echo "Running Prisma migrations..."
                pnpm exec prisma migrate deploy
              else
                echo "No pending migrations, skipping."
              fi
              echo "Running RBAC sync..."
              pnpm exec tsx scripts/rbac-sync.ts
              echo "Init complete!"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: kibamail-postgres
                  key: DATABASE_URL
            # ... other env vars for migrations
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      containers:
        # nginx TLS sidecar
        - name: nginx
          image: nginx:1.27-alpine
          imagePullPolicy: IfNotPresent
          ports:
            - name: https
              containerPort: 443
              protocol: TCP
            - name: http
              containerPort: 80
              protocol: TCP
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
              readOnly: true
            - name: nginx-config
              mountPath: /etc/nginx/proxy_params.conf
              subPath: proxy_params.conf
              readOnly: true
            - name: tls-cert
              mountPath: /etc/ssl/certs
              readOnly: true
            - name: nginx-cache
              mountPath: /tmp
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          livenessProbe:
            httpGet:
              path: /nginx-health
              port: 443
              scheme: HTTPS
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /nginx-health
              port: 443
              scheme: HTTPS
            initialDelaySeconds: 2
            periodSeconds: 5

        # Control plane (Next.js)
        - name: control-plane
          image: ghcr.io/kibamail/kibamail:staging
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          env:
            - name: HOSTNAME
              value: "0.0.0.0"
            - name: PORT
              value: "3000"
            # ... all existing control-plane env vars ...
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1024Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10

        # Marketing site
        - name: marketing
          image: ghcr.io/kibamail/kibamail-marketing:staging
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3001
              protocol: TCP
          env:
            - name: PORT
              value: "3001"
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10

      volumes:
        - name: nginx-config
          configMap:
            name: kibamail-web-nginx
        - name: tls-cert
          secret:
            secretName: kibamail-tls
        - name: nginx-cache
          emptyDir: {}
```

### 2.3 Create kibamail-web service

**File:** `infra/control-plane/clusters/base/kibamail/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kibamail-web
  namespace: kibamail
  labels:
    app.kubernetes.io/name: kibamail-web
    app.kubernetes.io/component: web
    app.kubernetes.io/part-of: kibamail
spec:
  type: ClusterIP
  ports:
    - name: https
      port: 443
      targetPort: https
      protocol: TCP
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app.kubernetes.io/name: kibamail-web
```

### 2.4 Move certificate to kibamail namespace

**File:** `infra/control-plane/clusters/base/kibamail/certificate.yaml`

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: kibamail-tls
  namespace: kibamail
spec:
  secretName: kibamail-tls
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - kibamail.com
    - www.kibamail.com
    - api.kibamail.com
```

**Note:** `api.kibamail.com` is now included in the same certificate since it's served by the same nginx sidecar.

---

## Phase 3: Update logto with nginx Sidecar

### 3.1 Update logto deployment

**File:** `infra/control-plane/clusters/base/logto/deployment.yaml`

Add nginx sidecar container:

```yaml
# Add to containers:
- name: nginx
  image: nginx:1.27-alpine
  imagePullPolicy: IfNotPresent
  ports:
    - name: https
      containerPort: 443
      protocol: TCP
    - name: http-redirect
      containerPort: 80
      protocol: TCP
  volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf
      readOnly: true
    - name: tls-cert
      mountPath: /etc/ssl/certs
      readOnly: true
    - name: nginx-tmp
      mountPath: /tmp
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi
  livenessProbe:
    httpGet:
      path: /nginx-health
      port: 443
      scheme: HTTPS
    initialDelaySeconds: 5
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /nginx-health
      port: 443
      scheme: HTTPS
    initialDelaySeconds: 2
    periodSeconds: 5

# Add to volumes:
- name: nginx-config
  configMap:
    name: logto-nginx
- name: tls-cert
  secret:
    secretName: logto-tls
- name: nginx-tmp
  emptyDir: {}
```

### 3.2 Update logto service

**File:** `infra/control-plane/clusters/base/logto/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: logto
  namespace: logto
  labels:
    app.kubernetes.io/name: logto
    app.kubernetes.io/component: auth
    app.kubernetes.io/part-of: kibamail
spec:
  type: ClusterIP
  ports:
    - name: https
      port: 443
      targetPort: https
      protocol: TCP
    - name: http
      port: 80
      targetPort: http-redirect
      protocol: TCP
    - name: internal-main
      port: 3001
      targetPort: http-main
      protocol: TCP
    - name: internal-admin
      port: 3002
      targetPort: http-admin
      protocol: TCP
  selector:
    app.kubernetes.io/name: logto
```

---

## Phase 4: Update Gateway and Routes

### 4.1 Update Gateway to TLS Passthrough

**File:** `infra/control-plane/clusters/base/ingress/gateway.yaml`

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: kibamail-gateway
spec:
  gatewayClassName: cilium
  listeners:
    # HTTP listener for ACME challenges and health checks
    - name: http
      protocol: HTTP
      port: 30080
      allowedRoutes:
        namespaces:
          from: All

    # TLS Passthrough for kibamail.com and www.kibamail.com
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

    # TLS Passthrough for kibamail.com (apex)
    - name: tls-kibamail-apex
      protocol: TLS
      port: 30443
      hostname: kibamail.com
      tls:
        mode: Passthrough
      allowedRoutes:
        namespaces:
          from: All
        kinds:
          - kind: TLSRoute

    # TLS Passthrough catch-all for customer tracking domains
    - name: tls-tracking-catchall
      protocol: TLS
      port: 30443
      tls:
        mode: Passthrough
      allowedRoutes:
        namespaces:
          from: All
        kinds:
          - kind: TLSRoute
```

### 4.2 Update TLSRoutes

**File:** `infra/control-plane/clusters/base/ingress/kibamail-routes.yaml`

```yaml
# TLSRoute for kibamail.com (apex)
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: kibamail-apex
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: tls-kibamail-apex
  hostnames:
    - kibamail.com
  rules:
    - backendRefs:
        - name: kibamail-web
          namespace: kibamail
          port: 443
---
# TLSRoute for www.kibamail.com
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: kibamail-www
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: tls-kibamail
  hostnames:
    - www.kibamail.com
  rules:
    - backendRefs:
        - name: kibamail-web
          namespace: kibamail
          port: 443
---
# TLSRoute for api.kibamail.com
# Routes to same kibamail-web service, nginx handles /api routing
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: kibamail-api
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: tls-kibamail
  hostnames:
    - api.kibamail.com
  rules:
    - backendRefs:
        - name: kibamail-web
          namespace: kibamail
          port: 443
---
# TLSRoute for auth.kibamail.com
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: logto-main
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: tls-kibamail
  hostnames:
    - auth.kibamail.com
  rules:
    - backendRefs:
        - name: logto
          namespace: logto
          port: 443
---
# TLSRoute for admin.auth.kibamail.com
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: logto-admin
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: tls-kibamail
  hostnames:
    - admin.auth.kibamail.com
  rules:
    - backendRefs:
        - name: logto
          namespace: logto
          port: 443
---
# TLSRoute catch-all for customer tracking domains
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: kibamail-tracking
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: tls-tracking-catchall
  rules:
    - backendRefs:
        - name: kibamail-tracking
          namespace: kibamail-tracking
          port: 443
---
# ReferenceGrants
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-to-kibamail
  namespace: kibamail
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: TLSRoute
      namespace: default
  to:
    - group: ""
      kind: Service
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-to-logto
  namespace: logto
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: TLSRoute
      namespace: default
  to:
    - group: ""
      kind: Service
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-to-tracking
  namespace: kibamail-tracking
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: TLSRoute
      namespace: default
  to:
    - group: ""
      kind: Service
```

### 4.3 Update HTTP routes for ACME and health checks

**File:** `infra/control-plane/clusters/base/ingress/http-redirect.yaml`

```yaml
# HTTP to HTTPS redirect (except ACME challenges)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: http-to-https-redirect
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: http
  rules:
    # Health check (no redirect)
    - matches:
        - path:
            type: Exact
            value: /healthz
      backendRefs:
        - name: kibamail-web
          namespace: kibamail
          port: 80
    # Redirect everything else to HTTPS
    - filters:
        - type: RequestRedirect
          requestRedirect:
            scheme: https
            statusCode: 301
---
# ACME HTTP-01 Challenge Route
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: acme-challenge-http
spec:
  parentRefs:
    - name: kibamail-gateway
      sectionName: http
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /.well-known/acme-challenge/
      backendRefs:
        - name: kibamail-tracking
          namespace: kibamail-tracking
          port: 80
```

---

## Phase 5: Update Kustomization

### 5.1 Update base kustomization

**File:** `infra/control-plane/clusters/base/kustomization.yaml`

```yaml
# Add new resources:
resources:
  # ... existing resources ...
  - kibamail/namespace.yaml
  - kibamail/deployment.yaml
  - kibamail/service.yaml
  - kibamail/certificate.yaml
  - kibamail/nginx-configmap.yaml
  - logto/nginx-configmap.yaml

# Remove old resources:
# - kibamail-control-plane/  (replaced by kibamail/)
# - kibamail-marketing/      (consolidated into kibamail/)
# - kibamail-api/            (consolidated into kibamail/)
```

### 5.2 Update production overlay

**File:** `infra/control-plane/clusters/overlays/production/kustomization.yaml`

Update patches for new namespace structure.

---

## Phase 6: Migration Steps

### Step 1: Prepare (No Downtime)

1. Create all new ConfigMaps (nginx configs)
2. Create new `kibamail` namespace
3. Create new certificate in `kibamail` namespace
4. Wait for certificate to be issued

### Step 2: Deploy New Services (Parallel Running)

1. Deploy `kibamail-web` in new namespace (not yet routed)
2. Update `kibamail-api` deployment with nginx sidecar
3. Update `logto` deployment with nginx sidecar
4. Verify all pods are healthy

### Step 3: Switch Gateway (Brief Interruption ~10s)

1. Apply new Gateway configuration (TLS Passthrough)
2. Apply new TLSRoutes
3. Monitor for errors

### Step 4: Cleanup

1. Delete old `kibamail-control-plane` namespace
2. Delete old `kibamail-marketing` namespace
3. Delete old `kibamail-api` namespace
4. Remove old HTTPRoutes
5. Remove unused certificates (kibamail-api-tls)

---

## Rollback Plan

If issues occur after Step 3:

1. Revert Gateway to HTTPS Terminate mode:
   ```bash
   git checkout HEAD~1 -- infra/control-plane/clusters/base/ingress/gateway.yaml
   kubectl apply -f infra/control-plane/clusters/base/ingress/gateway.yaml
   ```

2. Revert routes:
   ```bash
   git checkout HEAD~1 -- infra/control-plane/clusters/base/ingress/kibamail-routes.yaml
   kubectl apply -f infra/control-plane/clusters/base/ingress/kibamail-routes.yaml
   ```

3. Old services (kibamail-control-plane, kibamail-marketing) should still be running

---

## Verification Checklist

### Pre-Migration

- [ ] All new ConfigMaps created
- [ ] Certificate issued in kibamail namespace (includes kibamail.com, www.kibamail.com, api.kibamail.com)
- [ ] kibamail-web pods healthy
- [ ] logto pods healthy with sidecar

### Post-Migration

- [ ] `curl -v https://kibamail.com` - serves kibamail-tls cert
- [ ] `curl -v https://www.kibamail.com` - serves kibamail-tls cert
- [ ] `curl -v https://api.kibamail.com` - serves kibamail-tls cert (same cert, includes api subdomain)
- [ ] `curl -v https://api.kibamail.com/health` - returns API response (routed to /api/health)
- [ ] `curl -v https://auth.kibamail.com` - serves logto-tls cert
- [ ] `curl -v https://admin.auth.kibamail.com` - serves logto-tls cert
- [ ] `curl -v https://e.kbmta.net` - serves tracking-tls cert
- [ ] `curl -v https://e.newsletter.katifrantz.com` - serves customer cert (dynamic)
- [ ] ACME challenges work (HTTP-01)
- [ ] HTTP to HTTPS redirect works

---

## Files to Create/Modify Summary

### New Files

| File | Description |
|------|-------------|
| `base/kibamail/namespace.yaml` | New namespace |
| `base/kibamail/deployment.yaml` | Consolidated deployment (nginx + control-plane + marketing) |
| `base/kibamail/service.yaml` | Service exposing port 443 |
| `base/kibamail/certificate.yaml` | TLS certificate (kibamail.com, www, api) |
| `base/kibamail/nginx-configmap.yaml` | nginx TLS config with hostname-based routing |
| `base/logto/nginx-configmap.yaml` | nginx TLS config for auth domains |

### Modified Files

| File | Changes |
|------|---------|
| `base/ingress/gateway.yaml` | HTTPS Terminate → TLS Passthrough |
| `base/ingress/kibamail-routes.yaml` | HTTPRoute → TLSRoute |
| `base/ingress/http-redirect.yaml` | Update backend refs to kibamail namespace |
| `base/logto/deployment.yaml` | Add nginx sidecar container |
| `base/logto/service.yaml` | Add port 443 |
| `base/kustomization.yaml` | Update resources |

### Deleted Files/Directories

| Path | Reason |
|------|--------|
| `base/kibamail-control-plane/` | Replaced by kibamail/ |
| `base/kibamail-marketing/` | Consolidated into kibamail/ |
| `base/kibamail-api/` | Consolidated into kibamail/ (same codebase) |

---

## Notes

1. **Secrets Migration**: Secrets referenced by control-plane, marketing, and api need to be copied/moved to the new `kibamail` namespace.

2. **External Secrets**: If using ExternalSecrets operator, update the ExternalSecret resources to target the new namespace.

3. **Monitoring**: Update any monitoring/alerting rules that reference the old namespace names (kibamail-control-plane, kibamail-marketing, kibamail-api).

4. **CI/CD**: Update deployment pipelines to target new namespace and deployment names.

5. **API Routing**: The nginx sidecar in kibamail handles `api.kibamail.com` by rewriting requests to `/api/*` before proxying to the control-plane container. This means `api.kibamail.com/users` becomes `/api/users` internally.
