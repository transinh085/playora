# Môi trường và triển khai

Cập nhật: 26/10/2026 · Owner: Tech Lead (founder) · Liên quan: [engineering/architecture.md](../engineering/architecture.md), [engineering/conventions.md](../engineering/conventions.md), [runbook.md](./runbook.md), [business/compliance.md](../business/compliance.md)

Cấu hình triển khai production cho một VM (`infra/compose/docker-compose.prod.yml`, `infra/caddy/Caddyfile`, `infra/env/prod.env.example`, `infra/scripts/{deploy,backup,restore}.sh`) đã có sẵn trong repo; CI tự push 5 image lên GHCR khi merge `main`. Tài liệu này viết cho một người vận hành: ít thành phần, dễ khôi phục, chi phí thấp.

---

## 1. Môi trường

| Env | Mục đích | Hạ tầng |
|---|---|---|
| `local` | Phát triển | `bun run infra:up` (Docker compose: Postgres :54329, Valkey :63799, MinIO :9000/:9001, Mailpit :8025) + `bun run dev` |
| `test` | Integration test | DB `playora_test` do `@playora/db/testing` tự tạo và migrate; dùng chung Postgres/Valkey dev |
| `staging` (đích) | Demo cho khách, chơi thử, kiểm tra trước khi deploy production | Có thể là cùng VM với production nhưng DB và subdomain riêng `[GĐ]` |
| `production` | Khách thật (pilot Tết) | §2 (`infra/compose/docker-compose.prod.yml`) |

Nhiều worktree chạy song song dùng chung Postgres/Valkey dev và cổng 3000–4002: xem [AGENTS.md](../../AGENTS.md) phần "Parallel agents".

## 2. Production theo giai đoạn

| Giai đoạn | Cấu hình | Khi nào chuyển |
|---|---|---|
| **Khởi đầu** (pilot, vài chục quán) | **1 VM** (4 vCPU / 8 GB RAM / 80 GB NVMe `[GĐ]`) chạy Docker Compose (`infra/compose/docker-compose.prod.yml`): `caddy`, `api`, `worker`, `studio`, `play`, `web`, `valkey` (bật bền vững AOF + RDB) và job một lần `migrate`; **Postgres managed** có backup PITR (kèm dịch vụ `postgres` tự host đang comment sẵn để dự phòng); object storage S3-compatible; Cloudflare đứng trước mọi thứ | Mặc định |
| **Tăng tải** | Tách API ra 2 node sau load balancer; worker riêng; Valkey managed | Load test hoặc số liệu thật cho thấy 1 node không đạt p95 < 200 ms ở đỉnh, hoặc cần deploy không gián đoạn |
| **Sau** | Kubernetes managed, autoscale, read replica, analytics tách riêng | Khi có đội vận hành |

### 2.1 Thành phần đã có trong `infra/`

- **`infra/compose/docker-compose.prod.yml`**:
  - `caddy` (`caddy:2-alpine`): lắng nghe `:80` và `:443`, tự cấp HTTPS, chỉ khởi động khi `api`, `studio`, `play`, `web` đều healthy.
  - `valkey` (`valkey/valkey:8-alpine`): lưu AOF (`appendonly yes`, `appendfsync everysec`) + snapshot RDB vào volume `valkey_data`.
  - `migrate`: chạy một lần `bun run db:migrate` từ image `playora-api:${TAG}` (`working_dir: /app`); `api` và `worker` phụ thuộc `migrate` với điều kiện `service_completed_successfully`.
  - `api`, `worker`, `studio`, `play`, `web`: kéo từ `ghcr.io/<owner>/playora-<app>:${TAG}`; healthcheck của `api` gọi trực tiếp `http://127.0.0.1:4000/v1/health/ready` (kiểm tra cả DB, Valkey và migration mới nhất).
  - `postgres` (comment sẵn): phương án dự phòng tự host trên cùng VM nếu nhà cung cấp chưa có managed Postgres.
- **`infra/caddy/Caddyfile`**:
  - Định tuyến 4 tên miền: `api.playora.vn → api:4000`, `studio.playora.vn → studio:3000`, `play.playora.vn → play:3000`, `playora.vn → web:3000` (và `www.playora.vn` chuyển hướng 301 về `playora.vn`).
  - Khai báo `trusted_proxies` dải IP của Cloudflare + `client_ip_headers Cf-Connecting-Ip X-Forwarded-For` (khớp với `TRUST_PROXY=2` ở `apps/api`).
  - Gắn security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` / `Content-Security-Policy: frame-ancestors 'self' https://studio.playora.vn` cho `play.playora.vn/preview`).

### 2.2 Quy trình triển khai từng bước trên VM

Không dùng `drizzle-kit push` trên staging/production; migration luôn chạy bằng `bun run db:migrate` **trước** khi khởi động app mới, và phải tương thích ngược với bản app đang chạy ([engineering/data-model.md §6](../engineering/data-model.md#6-migration-và-seed)).

1. **Chuẩn bị VM lần đầu:**
   - Cài Docker Engine + Docker Compose plugin trên Ubuntu 24.04 LTS; mở tường lửa cổng `22`, `80`, `443` (chỉ nhận `80/443` từ dải IP Cloudflare).
   - Clone repo (hoặc chép thư mục `infra/`) vào `/opt/playora`.
   - Sao chép `infra/env/prod.env.example` thành `/opt/playora/infra/env/.env.prod`, điền toàn bộ biến `[SECRET]` (`chmod 600 infra/env/.env.prod`).
   - Đăng nhập GHCR bằng PAT chỉ có quyền `read:packages`:
     ```bash
     echo "<GHCR_READ_TOKEN>" | docker login ghcr.io -u <github-username> --password-stdin
     ```
2. **Kiểm tra cấu hình trước khi chạy:**
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod config
   ```
3. **Deploy một bản phát hành (theo commit SHA trên `main`):**
   ```bash
   ./infra/scripts/deploy.sh <commit-sha>
   ```
   Script thực hiện tuần tự:
   - `docker compose ... pull api worker studio play web` với `TAG=<commit-sha>`.
   - Đảm bảo `valkey` đang chạy và healthy.
   - Chạy `docker compose ... run --rm migrate` (`bun run db:migrate`). Nếu migration lỗi, dừng ngay và không chạm vào container `api` đang chạy.
   - Cập nhật lần lượt `api`, `worker`, `studio`, `play`, `web`, `caddy` và chờ từng dịch vụ đạt trạng thái `healthy`.
   - Gọi smoke check `GET /v1/health/ready` xác nhận `{ status: "ok", db: "ok", redis: "ok", migrations: { status: "ok" } }`.
4. **Rollback khi có sự cố:**
   Chạy lại `./infra/scripts/deploy.sh <previous-commit-sha>` với SHA của bản ổn định liền trước.

## 3. Vị trí hạ tầng

- **Khuyến nghị:** DB chứa PII và dịch vụ chính đặt **tại Việt Nam** (VNG Cloud, Viettel Cloud, FPT Cloud…): độ trễ thấp cho người chơi và giảm nghĩa vụ hồ sơ chuyển dữ liệu ra nước ngoài theo Luật 91/2025 (cần luật sư xác nhận, xem [business/compliance.md](../business/compliance.md)).
- Asset tĩnh (không PII) phân phối qua Cloudflare CDN.
- Phương án thay thế: AWS `ap-southeast-1` (Singapore) nếu cần dịch vụ managed phong phú hơn, kèm hồ sơ chuyển dữ liệu xuyên biên giới.

## 4. CI

`.github/workflows/ci.yml`, chạy trên mọi push/PR:

1. **`check`**: `bun install --frozen-lockfile` → `bun run lint` → `bun run db:migrate` → `bunx turbo run typecheck test build`.
2. **`e2e`** (sau `check`): migrate + seed → Playwright; report lưu 7 ngày.
3. **`docker`** (sau `check`, song song với `e2e`, quyền `packages: write`):
   - Trên **PR**: build 5 image (`api`, `worker`, `studio`, `play`, `web`) với tag `playora-<app>:ci`, cache GHA, `push: false`.
   - Khi **push lên `main`**: đăng nhập `ghcr.io` bằng `GITHUB_TOKEN`, build với build-arg production (`NEXT_PUBLIC_API_URL=https://api.playora.vn`, `NEXT_PUBLIC_PLAY_URL=https://play.playora.vn`, `NEXT_PUBLIC_STUDIO_ORIGINS=https://studio.playora.vn`) và **push** lên GHCR với 2 tag:
     - `ghcr.io/<owner>/playora-<app>:<git-sha>` (dùng để deploy/rollback chính xác).
     - `ghcr.io/<owner>/playora-<app>:latest`.

CI không tự SSH vào server production; việc deploy production được kích hoạt chủ động bằng `./infra/scripts/deploy.sh <git-sha>` ngoài cửa sổ đóng băng (§8).

## 5. Docker image

| Image | Tên trên GHCR | Dockerfile | Runtime |
|---|---|---|---|
| `api`, `worker` | `ghcr.io/<owner>/playora-{api,worker}:<tag>` | `infra/docker/Dockerfile.nest` | `turbo prune` → `bun build` → `oven/bun:1.4.4-slim`, chạy `bun dist/main.js` (image `api` kiêm luôn dịch vụ `migrate` chạy `bun run db:migrate` tại `/app`) |
| `studio`, `play`, `web` | `ghcr.io/<owner>/playora-{studio,play,web}:<tag>` | `infra/docker/Dockerfile.next` | `turbo prune` → `next build` (standalone) → `node:24-slim`, chạy `node <APP_DIR>/server.js` |

Biến `NEXT_PUBLIC_*` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PLAY_URL`, `NEXT_PUBLIC_STUDIO_ORIGINS`) truyền bằng `--build-arg` vì Next.js nhúng vào client bundle lúc build.

```bash
# Build thử local:
docker build -f infra/docker/Dockerfile.nest --build-arg APP=@playora/api --build-arg APP_DIR=apps/api -t playora-api:test .
docker build -f infra/docker/Dockerfile.next --build-arg APP=@playora/play --build-arg APP_DIR=apps/play -t playora-play:test .
```

## 6. Biến môi trường và bí mật

- Schema env theo app ở `packages/env` (zod); app crash ngay khi thiếu biến.
- Bản mẫu đầy đủ cho production nằm ở **`infra/env/prod.env.example`** (kèm chú thích từng biến và đánh dấu `[SECRET]`): `DATABASE_URL`, `DATABASE_POOL_MAX`, `REDIS_URL`, `API_PORT`, `API_PUBLIC_URL`, `PLAY_URL`, `STUDIO_ORIGINS`, `COOKIE_DOMAIN` (`.playora.vn`), `TRUST_PROXY` (`2`), `BETTER_AUTH_SECRET`, `PLAYER_SESSION_SECRET`, `PII_ENCRYPTION_KEY`, `PII_ENCRYPTION_KEY_ID`, `PII_HMAC_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `PLATFORM_ADMIN_EMAILS`, `WORKER_HEALTH_PORT`, `S3_*`, `SMTP_*`, `GOOGLE_CLIENT_*`, `NEXT_PUBLIC_*`, và `BACKUP_S3_*`.
- Production bắt buộc secret tường minh; app từ chối thông tin S3 mặc định của dev (`playora`/`playora123`).
- File `/opt/playora/infra/env/.env.prod` trên VM đặt quyền `0600`, không bao giờ commit vào git. Xoay `BETTER_AUTH_SECRET`, `PLAYER_SESSION_SECRET` khi nghi lộ (xoay `PLAYER_SESSION_SECRET` làm mọi người chơi phải join lại).

## 7. Sao lưu và khôi phục

- **Postgres managed:** bật PITR 7 ngày + snapshot tự động hằng ngày giữ 30 ngày `[GĐ]`.
- **Sao lưu logic dự phòng (`infra/scripts/backup.sh`):** chạy `pg_dump --format=custom` từ `DATABASE_URL`, tạo file kiểm tra `.sha256`, đẩy lên bucket S3 (`s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/playora-<timestamp>.dump`) và tự xoá bản cũ hơn `BACKUP_RETENTION_DAYS` (mặc định 30 ngày). Đặt cron hằng ngày lúc 03:15 giờ VN (`15 20 * * *` UTC).
- **Khôi phục (`infra/scripts/restore.sh`):** tải bản dump từ S3, kiểm tra SHA-256 và chạy `pg_restore --single-transaction` vào `TARGET_DATABASE_URL`:
  ```bash
  TARGET_DATABASE_URL=postgres://... RESTORE_CONFIRM=yes ./infra/scripts/restore.sh playora-20261026T160000Z.dump
  ```
- **Object storage:** bật versioning cho bucket asset.
- **Diễn tập khôi phục** trước chương trình thật đầu tiên, sau đó mỗi quý; ghi thời gian khôi phục thực tế vào [runbook.md](./runbook.md).

## 8. Cửa sổ đóng băng (freeze window)

Không deploy production từ **2 giờ trước đến 1 giờ sau** các mốc được đánh dấu quan trọng (`events.is_critical`, hiện chỉ đặt được bằng SQL; chưa có trong Studio/API): giờ mở chương trình lớn, giờ bốc thăm cuối chương trình. Hotfix trong cửa sổ này chỉ khi đang phát sai giải hoặc sập, và phải ghi lại trong runbook.
