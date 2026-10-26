# Playora Infrastructure (`infra/`)

This directory contains everything needed to run local development dependencies and a single-VM production stack for the Playora pilot (`docs/operations/environments-deploy.md` §2).

## Layout

```
infra/
├── caddy/
│   └── Caddyfile                   # Reverse proxy (auto HTTPS, Cloudflare trusted proxies, security headers)
├── compose/
│   ├── docker-compose.dev.yml      # Local dev: Postgres :54329, Valkey :63799, MinIO :9000, Mailpit :8025
│   └── docker-compose.prod.yml     # Single-VM prod: caddy, valkey, migrate, api, worker, studio, play, web
├── docker/
│   ├── Dockerfile.nest             # Multi-stage Bun image for @playora/api and @playora/worker
│   └── Dockerfile.next             # Multi-stage Node 24 standalone image for @playora/{studio,play,web}
├── env/
│   └── prod.env.example            # Annotated production environment template (secrets marked [SECRET])
└── scripts/
    ├── deploy.sh                   # Pull GHCR tag -> run migrate -> rolling update -> smoke check /v1/health/ready
    ├── backup.sh                   # pg_dump + SHA-256 -> S3-compatible bucket + retention pruning
    └── restore.sh                  # Download S3 dump -> verify SHA-256 -> pg_restore --single-transaction
```

## Quick Reference (Production VM)

```bash
# 1. Validate compose configuration against your env file
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod config

# 2. Deploy a commit SHA pushed to GHCR by main CI
./infra/scripts/deploy.sh <git-commit-sha>

# 3. Roll back to a previous commit SHA
./infra/scripts/deploy.sh <previous-git-commit-sha>

# 4. Run a logical database backup to S3
ENV_FILE=/opt/playora/infra/env/.env.prod ./infra/scripts/backup.sh

# 5. Restore a backup into a drill or recovery database
TARGET_DATABASE_URL="postgres://..." RESTORE_CONFIRM=yes ./infra/scripts/restore.sh playora-YYYYMMDDTHHMMSSZ.dump
```

---

## External Accounts & Resources the Founder Must Buy / Sign Up For

Before running the first pilot campaign (`docs/operations/runbook.md` §3.2), provision the following external services:
1. **VM Provider in Vietnam (1 VM: 4 vCPU / 8 GB RAM / 80 GB NVMe, Ubuntu 24.04 LTS)**
   - Recommended providers: **VNG Cloud (vServer)**, **FPT Cloud**, or **Viettel Cloud** (Ho Chi Minh City or Hanoi region) to keep latency low for café guests and keep PII inside Vietnam (`docs/operations/environments-deploy.md` §3).
   - Enable inbound firewall rules for `22/tcp` (SSH key-only, admin IP) and `80/tcp`, `443/tcp`, `443/udp` (restricted to Cloudflare IP ranges).

2. **Managed PostgreSQL 17 (with PITR)**
   - Provision a managed PostgreSQL 17 instance in the same Vietnam cloud region and VPC as the VM (e.g., VNG Cloud vDB / FPT Cloud Database).
   - Enable **7-day Point-in-Time Recovery (PITR)** and **30-day daily snapshots**, enforce TLS (`?sslmode=require`), and place the connection URI in `DATABASE_URL`.
   - _Fallback:_ If the chosen provider lacks managed Postgres with PITR, uncomment the `postgres` service in `infra/compose/docker-compose.prod.yml` and schedule `infra/scripts/backup.sh` via cron (`15 20 * * *` UTC).

3. **S3-Compatible Object Storage (2 Buckets)**
   - **Assets bucket (`S3_BUCKET`, e.g. `playora-prod-assets`):** stores organizer-uploaded logos, prize photos, and campaign exports. Enable object versioning and configure CORS for `https://studio.playora.vn` presigned `PUT` uploads.
   - **Backups bucket (`BACKUP_S3_BUCKET`, e.g. `playora-prod-backups`):** private bucket for `infra/scripts/backup.sh` logical dumps.
   - Create scoped access keys for the app (`S3_ACCESS_KEY` / `S3_SECRET_KEY`) and for backups (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).

4. **Domain Name (`playora.vn`)**
   - Register `playora.vn` via a VNNIC-accredited registrar (iNET, PA Vietnam, Tenten, Mat Bao).

5. **Cloudflare Account (DNS, CDN, WAF, Turnstile)**
   - Delegate `playora.vn` nameservers to Cloudflare.
   - Create proxied (`orange-cloud`) `A`/`AAAA` records pointing to the VM public IP for:
     - `playora.vn` and `www.playora.vn` (`apps/web`)
     - `studio.playora.vn` (`apps/studio`)
     - `play.playora.vn` (`apps/play`)
     - `api.playora.vn` (`apps/api`)
   - Set SSL/TLS mode to **Full (strict)**.
   - Create a **Cloudflare Turnstile** widget for public player join anti-bot checks (P1.5).

6. **GitHub Container Registry (GHCR) Token**
   - Create a GitHub Personal Access Token (classic) with **`read:packages`** scope only.
   - Use it on the production VM (`docker login ghcr.io`) so `infra/scripts/deploy.sh` can pull `ghcr.io/<owner>/playora-{api,worker,studio,play,web}:<sha>`.

7. **Transactional SMTP Provider (+ Optional Google OAuth)**
   - Sign up for a transactional email service (Amazon SES `ap-southeast-1`, Postmark, or Resend SMTP) and configure SPF, DKIM, and DMARC records on `playora.vn` for organizer invitations and magic links (`SMTP_*`).
   - _(Optional)_ Create a Google Cloud OAuth 2.0 Client (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) with authorized redirect URI `https://api.playora.vn/auth/callback/google`.

8. **Uptime Monitor & Alert Channel**
   - Sign up for an external uptime monitor (Better Stack / UptimeRobot / Checkly) polling every 60 seconds:
     - `https://api.playora.vn/v1/health/ready` (assert HTTP 200 and JSON `"status":"ok"`)
     - `https://studio.playora.vn/login`
     - `https://play.playora.vn`
     - `https://playora.vn`
   - Connect alerts to a **Telegram bot / Zalo / phone call** channel on the founder's phone and trigger a test alert before pilot launch.
