# KumoMTA Production Setup

This directory contains the KumoMTA configuration for Kibamail's Mail Transfer Agent infrastructure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SENDING CLUSTER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   KumoMTA    │────▶│  TSA Daemon  │────▶│         Redis                │ │
│  │  (kumod)     │     │              │     │  (Traffic Shaping State)     │ │
│  └──────┬───────┘     └──────────────┘     └──────────────────────────────┘ │
│         │                                                                    │
│         │  SMTP Injection (Port 587)                                         │
│         │  - Credentials validated via Email Agent                           │
│         │  - Tenant DKIM keys fetched & cached                               │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        MARKETING POOL                                 │   │
│  │  ┌────────────────┐              ┌────────────────┐                  │   │
│  │  │   IP 1         │              │   IP 2         │                  │   │
│  │  │ mta1.kbmta.net │◀── Round ───▶│ mta2.kbmta.net │                  │   │
│  │  └────────────────┘    Robin     └────────────────┘                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         │  All Logs via HTTP Webhook                                         │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         EMAIL AGENT                                   │   │
│  │  - Credential validation                                              │   │
│  │  - Tenant DKIM key retrieval                                          │   │
│  │  - Log ingestion (deliveries, bounces, deferrals)                     │   │
│  │  - URL rewriting coordination                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## DKIM Signing Strategy

KumoMTA implements 2-fold DKIM signing:

1. **MTA DKIM Signing**: Signs with MTA's own keys (selector: `kbmta`, domain: `kbmta.net`)
2. **Tenant DKIM Signing**: Signs with tenant's domain keys (fetched from Email Agent API)

The tenant DKIM keys are:
- Fetched from Email Agent REST API on first use
- Cached using KumoMTA's built-in caching (`kumo.memoize`)
- Decrypted using APP_KEY before signing
- Cache TTL: 5 minutes (allows for key rotation)

---

## Production Checklist

### 1. Server Preparation

- [ ] **Hardware Requirements**
  - [ ] Minimum 4 CPU cores (8+ recommended for production)
  - [ ] 16GB+ RAM
  - [ ] SSD storage for spool (NVMe preferred)
  - [ ] Dedicated network interface for sending IPs

- [ ] **Operating System**
  - [ ] Rocky Linux 9 / Ubuntu 22.04 LTS installed
  - [ ] System fully updated (`dnf update -y` or `apt upgrade -y`)
  - [ ] Timezone set to UTC

- [ ] **Kernel Tuning** (`/etc/sysctl.conf`)
  ```conf
  vm.max_map_count = 768000
  net.core.rmem_default = 32768
  net.core.wmem_default = 32768
  net.core.rmem_max = 262144
  net.core.wmem_max = 262144
  fs.file-max = 250000
  net.ipv4.ip_local_port_range = 5000 63000
  net.ipv4.tcp_tw_reuse = 1
  vm.nr_hugepages = 20
  ```
  - [ ] Applied with `sysctl -p`

- [ ] **File Limits** (`/etc/security/limits.conf`)
  ```
  kumod soft nofile 250000
  kumod hard nofile 250000
  ```

---

### 2. Network & DNS Configuration

- [ ] **Firewall Rules**
  - [ ] Port 22 (SSH) - restricted to admin IPs
  - [ ] Port 25 (SMTP) - open for outbound, inbound for bounces
  - [ ] Port 587 (Submission) - open for injection from control plane
  - [ ] Port 8000 (HTTP API) - internal only
  - [ ] Port 8008 (TSA Daemon) - internal only

- [ ] **Sending IP Setup**
  - [ ] IP 1 configured and bound (`IP_1` env var)
  - [ ] IP 2 configured and bound (`IP_2` env var)
  - [ ] Both IPs have correct reverse DNS (PTR records)

- [ ] **DNS Records for MTA Domain (kbmta.net)**
  - [ ] A record: `mta1.kbmta.net` → IP_1
  - [ ] A record: `mta2.kbmta.net` → IP_2
  - [ ] PTR record: IP_1 → `mta1.kbmta.net`
  - [ ] PTR record: IP_2 → `mta2.kbmta.net`
  - [ ] MX record for bounce handling: `mail.kbmta.net`
  - [ ] SPF: `v=spf1 ip4:<IP_1> ip4:<IP_2> -all`
  - [ ] DKIM key published: `kbmta._domainkey.kbmta.net`
  - [ ] DMARC: `_dmarc.kbmta.net`

---

### 3. Dependencies Installation

- [ ] **Install KumoMTA**
  ```bash
  # Add repository and install
  curl -fsSL https://repos.kumomta.com/kumomta.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/kumomta.gpg
  echo "deb [signed-by=/etc/apt/keyrings/kumomta.gpg] https://repos.kumomta.com/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/kumomta.list
  sudo apt update && sudo apt install kumomta -y
  ```

- [ ] **Install Local DNS Resolver**
  ```bash
  sudo apt install bind9 -y
  sudo systemctl enable named && sudo systemctl start named
  ```

- [ ] **Disable Competing Services**
  ```bash
  sudo systemctl disable postfix exim4 sendmail 2>/dev/null || true
  sudo systemctl stop postfix exim4 sendmail 2>/dev/null || true
  ```

---

### 4. TLS Certificates

- [ ] **Obtain Certificates** (Let's Encrypt recommended)
  ```bash
  sudo certbot certonly --standalone -d mta1.kbmta.net -d mta2.kbmta.net
  ```

- [ ] **Copy to Standard Location**
  ```bash
  sudo mkdir -p /opt/kumomta/etc/tls
  sudo cp /etc/letsencrypt/live/mta1.kbmta.net/fullchain.pem /opt/kumomta/etc/tls/
  sudo cp /etc/letsencrypt/live/mta1.kbmta.net/privkey.pem /opt/kumomta/etc/tls/
  sudo chown kumod:kumod /opt/kumomta/etc/tls/*
  sudo chmod 600 /opt/kumomta/etc/tls/privkey.pem
  sudo chmod 644 /opt/kumomta/etc/tls/fullchain.pem
  ```

- [ ] **Certificate Paths** (standard location)
  - `/opt/kumomta/etc/tls/fullchain.pem`
  - `/opt/kumomta/etc/tls/privkey.pem`

- [ ] **Auto-renewal Hook** (copy certs after renewal)
  ```bash
  # Create renewal hook at /etc/letsencrypt/renewal-hooks/deploy/kumomta.sh
  #!/bin/bash
  cp /etc/letsencrypt/live/mta1.kbmta.net/fullchain.pem /opt/kumomta/etc/tls/
  cp /etc/letsencrypt/live/mta1.kbmta.net/privkey.pem /opt/kumomta/etc/tls/
  chown kumod:kumod /opt/kumomta/etc/tls/*
  systemctl reload kumod
  ```

---

### 5. Directory Structure

- [ ] **Create Required Directories**
  ```bash
  sudo mkdir -p /opt/kumomta/etc/policy
  sudo mkdir -p /opt/kumomta/etc/dkim
  sudo mkdir -p /opt/kumomta/etc/tls
  sudo mkdir -p /var/spool/kumomta/{data,meta}
  sudo mkdir -p /var/log/kumomta
  ```

- [ ] **Set Permissions**
  ```bash
  sudo chown -R kumod:kumod /var/spool/kumomta /var/log/kumomta /opt/kumomta/etc/dkim /opt/kumomta/etc/tls
  sudo chmod 2770 /var/spool/kumomta /var/log/kumomta /opt/kumomta/etc/dkim /opt/kumomta/etc/tls
  sudo chmod 755 /opt/kumomta/etc/policy
  ```

---

### 6. MTA DKIM Key Generation

- [ ] **Generate MTA DKIM Keys**
  ```bash
  # Using the provided script
  sudo ./apps/mta/scripts/setup-mta-dkim.sh

  # Or manually specify domain/selector
  sudo ./apps/mta/scripts/generate-dkim.sh kbmta.net kbmta
  ```

  The script will:
  - Generate 2048-bit RSA key pair
  - Save keys to `/opt/kumomta/etc/dkim/<domain>/<selector>.key`
  - Output the DNS TXT record to add

- [ ] **Publish DNS Record**
  Add the TXT record output by the script:
  ```
  kbmta._domainkey.kbmta.net. IN TXT "v=DKIM1; k=rsa; h=sha256; p=<public_key_base64>"
  ```

- [ ] **Verify DNS Record**
  ```bash
  dig +short TXT kbmta._domainkey.kbmta.net
  ```

---

### 7. Configuration Files

- [ ] **Copy Policy Files**
  ```bash
  sudo cp apps/mta/policy/init.lua /opt/kumomta/etc/policy/
  sudo cp apps/mta/policy/tsa_init.lua /opt/kumomta/etc/policy/
  sudo cp apps/mta/policy/shaping.toml /opt/kumomta/etc/policy/
  sudo cp apps/mta/policy/sources.toml /opt/kumomta/etc/policy/
  ```

- [ ] **Set File Permissions**
  ```bash
  sudo chown -R kumod:kumod /opt/kumomta/etc/policy
  sudo chmod 644 /opt/kumomta/etc/policy/*.lua
  sudo chmod 644 /opt/kumomta/etc/policy/*.toml
  ```

---

### 8. Environment Variables

- [ ] **Create Environment File** (`/etc/kumomta/env`)
  ```bash
  # Email Agent Configuration (no auth - internal network only)
  EMAIL_AGENT_URL=http://email-agent.internal:3000

  # MTA Identity
  MTA_HOSTNAME=mta1.kbmta.net

  # Webhook Destination
  WEBHOOK_URL=http://email-agent.internal:3000/api/v1/logs

  # TSA Daemon Configuration
  REDIS_URL=redis://localhost:6379
  TSA_LISTEN_PORT=8008
  ```

  **All environment variables are required. KumoMTA and TSA will fail to start if any are missing.**

  **Note:**
  - Sending IP addresses are configured in `sources.toml`
  - MTA DKIM signing is configured in `dkim_data.toml`
  - TLS certificates must be placed at standard location:
    - `/opt/kumomta/etc/tls/fullchain.pem`
    - `/opt/kumomta/etc/tls/privkey.pem`

- [ ] **Secure Environment File**
  ```bash
  sudo chmod 600 /etc/kumomta/env
  sudo chown kumod:kumod /etc/kumomta/env
  ```

---

### 9. Systemd Services

- [ ] **KumoMTA Service** (`/etc/systemd/system/kumod.service`)
  ```ini
  [Unit]
  Description=KumoMTA Mail Transfer Agent
  After=network.target redis.service

  [Service]
  Type=simple
  User=root
  EnvironmentFile=/etc/kumomta/env
  ExecStart=/opt/kumomta/sbin/kumod --policy /opt/kumomta/etc/policy/init.lua
  Restart=always
  RestartSec=5
  LimitNOFILE=250000

  [Install]
  WantedBy=multi-user.target
  ```

- [ ] **TSA Daemon Service** (`/etc/systemd/system/kumo-tsa.service`)
  ```ini
  [Unit]
  Description=KumoMTA Traffic Shaping Automation Daemon
  After=network.target redis.service

  [Service]
  Type=simple
  User=kumod
  EnvironmentFile=/etc/kumomta/env
  ExecStart=/opt/kumomta/sbin/kumo-tsa-daemon --policy /opt/kumomta/etc/policy/tsa_init.lua
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  ```

- [ ] **Enable Services**
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable kumod kumo-tsa
  ```

---

### 10. Redis Setup (for TSA)

- [ ] **Install Redis**
  ```bash
  sudo apt install redis-server -y
  ```

- [ ] **Configure Redis** (`/etc/redis/redis.conf`)
  ```conf
  bind 127.0.0.1
  maxmemory 512mb
  maxmemory-policy allkeys-lru
  ```

- [ ] **Start Redis**
  ```bash
  sudo systemctl enable redis && sudo systemctl start redis
  ```

---

### 11. Validation

- [ ] **Validate Configuration**
  ```bash
  /opt/kumomta/sbin/kumod --policy /opt/kumomta/etc/policy/init.lua --validate
  ```

- [ ] **Test SMTP Connection**
  ```bash
  echo "EHLO test" | nc localhost 587
  ```

- [ ] **Verify Webhook Connectivity**
  ```bash
  curl -X POST $WEBHOOK_URL/health
  ```

- [ ] **Check Email Agent Connectivity**
  ```bash
  curl $EMAIL_AGENT_URL/health
  ```

---

### 12. Start Services

- [ ] **Start in Order**
  ```bash
  sudo systemctl start redis
  sudo systemctl start kumo-tsa
  sudo systemctl start kumod
  ```

- [ ] **Verify Running**
  ```bash
  sudo systemctl status kumod kumo-tsa redis
  ss -tlnp | grep -E '(25|587|8000|8008)'
  ```

---

### 13. Monitoring & Logging

- [ ] **Verify Log Output**
  ```bash
  /opt/kumomta/sbin/tailer --tail /var/log/kumomta
  ```

- [ ] **Monitor Webhook Delivery**
  ```bash
  curl http://127.0.0.1:8000/api/admin/metrics
  ```

- [ ] **Check TSA Status**
  ```bash
  curl http://127.0.0.1:8008/get_config_v1/shaping.toml
  ```

---

### 14. Production Hardening

- [ ] **Fail2ban Configuration** (optional)
  ```bash
  sudo apt install fail2ban -y
  # Configure SMTP auth failure banning
  ```

- [ ] **Log Rotation** (`/etc/logrotate.d/kumomta`)
  ```
  /var/log/kumomta/*.log {
      daily
      rotate 14
      compress
      delaycompress
      missingok
      notifempty
  }
  ```

- [ ] **Backup DKIM Keys**
  ```bash
  sudo tar -czf /backup/dkim-keys-$(date +%Y%m%d).tar.gz /opt/kumomta/etc/dkim
  ```

---

## File Structure

```
apps/mta/
├── README.md                    # This file
├── policy/
│   ├── init.lua                 # Main KumoMTA policy
│   ├── tsa_init.lua             # TSA daemon configuration
│   ├── dkim_data.toml           # MTA DKIM signing configuration
│   ├── shaping.toml             # Traffic shaping rules
│   ├── sources.toml             # Egress IP pool configuration
│   └── bounces.toml             # Custom bounce classification rules
└── scripts/
    ├── generate-dkim.sh         # Generate DKIM keys for any domain
    └── setup-mta-dkim.sh        # Setup MTA signing domain DKIM
```

## Email Agent API Endpoints Required

The MTA communicates with Email Agent over internal network (no authentication).

### POST /api/v1/auth/validate
Validates SMTP injection credentials (called on every auth attempt, no caching).
```json
// Request
{
  "username": "string",
  "password": "string"
}

// Response
{
  "valid": true,
  "workspaceId": "string"
}
```

### GET /api/v1/dkim/:domainName
Retrieves tenant DKIM signing key.
```json
// Response
{
  "domain": "example.com",
  "selector": "kibamail",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
  "algorithm": "rsa-sha256"
}
```
Note: Private key is returned in plain text PEM format.

### POST /api/v1/logs
Receives all MTA log events (webhook).
```json
// Request (array of log records)
[
  {
    "type": "Delivery",
    "id": "message_id",
    "sender": "from@domain.com",
    "recipient": "to@domain.com",
    "timestamp": "2024-01-01T00:00:00Z",
    "meta": { ... }
  }
]
```

---

## Troubleshooting

### Common Issues

1. **DKIM Signing Fails**
   - Check Email Agent connectivity
   - Verify APP_KEY matches between MTA and control plane
   - Check cached key expiration

2. **Authentication Fails**
   - Verify EMAIL_AGENT_URL is reachable
   - Check API key validity
   - Review auth endpoint logs

3. **High Memory Usage**
   - Reduce `max_ready` queue size
   - Check for delivery backlogs
   - Monitor RocksDB memory usage

4. **TSA Not Responding**
   - Verify Redis connectivity
   - Check TSA daemon logs
   - Ensure port 8008 is accessible

### Useful Commands

```bash
# Check queue status
curl http://127.0.0.1:8000/api/admin/queues

# Flush specific queue
curl -X POST http://127.0.0.1:8000/api/admin/queues/flush

# View active connections
curl http://127.0.0.1:8000/api/admin/connections

# Check memory usage
curl http://127.0.0.1:8000/api/admin/memory
```
