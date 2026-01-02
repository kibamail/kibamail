This guide provides instructions on installing monitor on ubuntu 24.04.

Original guide: https://monitor.io/docs/install/docker/#install-monitor-using-the-install-script

1. clone repository

```bash
git clone -b main https://github.com/monitor/monitor.git && cd monitor/deploy/
```

2. run install script

```bash
./install.sh
```

monitor will start the following services:

- Dashboard on http://localhost:8080 (exposed as monitor.kibamail.com)
- OTEL Collector on http://localhost:4318 (HTTP) and localhost:4317 (gRPC) (exposed as ingest.monitor.kibamail.com)

3. Install Nginx and Certbot for SSL termination

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

4. Create Nginx configuration for monitor.kibamail.com

```bash
sudo tee /etc/nginx/sites-available/monitor.kibamail.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name monitor.kibamail.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF
```

5. Create Nginx configuration for ingest.monitor.kibamail.com (OTEL Collector)

```bash
sudo tee /etc/nginx/sites-available/ingest.monitor.kibamail.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name ingest.monitor.kibamail.com;

    # HTTP OTLP endpoint (port 4318)
    location / {
        proxy_pass http://127.0.0.1:4318;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;

        # Allow large payloads for telemetry data
        client_max_body_size 50m;
    }
}
EOF
```

6. Enable the sites and test Nginx configuration

```bash
sudo ln -sf /etc/nginx/sites-available/monitor.kibamail.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/ingest.monitor.kibamail.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. Obtain Let's Encrypt SSL certificates for both domains

```bash
sudo certbot --nginx -d monitor.kibamail.com -d ingest.monitor.kibamail.com --non-interactive --agree-tos -m engineering@kibamail.com
```

This command will:

- Obtain a certificate from Let's Encrypt
- Automatically configure Nginx for HTTPS
- Set up automatic renewal via systemd timer

7. Verify auto-renewal is configured

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

8. (Optional) Configure firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw delete allow 'Nginx HTTP'
```

9. Access monitor at https://monitor.kibamail.com

The certificate will automatically renew before expiration. Certbot runs twice daily via systemd timer and renews certificates that are within 30 days of expiration.

```bash
🟢 Your installation is complete!

🟢 SigNoz is running on http://localhost:8080

ℹ️  By default, retention period is set to 15 days for logs and traces, and 30 days for metrics.
To change this, navigate to the General tab on the Settings page of SigNoz UI. For more details, refer to https://signoz.io/docs/userguide/retention-period

ℹ️  To bring down SigNoz and clean volumes:

cd docker
sudo docker compose down -v

```
