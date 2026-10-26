# Môi trường và triển khai

Cập nhật: 26/10/2026 · Owner: Tech Lead (founder) · Liên quan: [engineering/architecture.md](../engineering/architecture.md), [engineering/conventions.md](../engineering/conventions.md), [runbook.md](./runbook.md), [business/compliance.md](../business/compliance.md)

Hiện **chưa có staging hay production**. CI chỉ build image, chưa push hay deploy. Tài liệu này là cách làm đích, viết cho một người vận hành: ít thành phần, dễ khôi phục, chi phí thấp.

---

## 1. Môi trường

| Env | Mục đích | Hạ tầng |
|---|---|---|
| `local` | Phát triển | `bun run infra:up` (Docker compose: Postgres :54329, Valkey :63799, MinIO :9000/:9001, Mailpit :8025) + `bun run dev` |
| `test` | Integration test | DB `playora_test` do `@playora/db/testing` tự tạo và migrate; dùng chung Postgres/Valkey dev |
| `staging` (đích) | Demo cho khách, chơi thử, kiểm tra trước khi deploy production | Có thể là cùng VM với production nhưng DB và subdomain riêng `[GĐ]` |
| `production` (đích) | Khách thật | §2 |

Nhiều worktree chạy song song dùng chung Postgres/Valkey dev và cổng 3000–4002: xem [AGENTS.md](../../AGENTS.md) phần "Parallel agents".

## 2. Production theo giai đoạn

| Giai đoạn | Cấu hình | Khi nào chuyển |
|---|---|---|
| **Khởi đầu** (pilot, vài chục quán) | **1 VM** (4 vCPU / 8 GB `[GĐ]`) chạy Docker: api, worker, studio, play, web + Valkey; **Postgres managed** có backup PITR; object storage S3-compatible; Cloudflare trước mọi thứ | Mặc định |
| **Tăng tải** | Tách API ra 2 node sau load balancer; worker riêng; Valkey managed | Load test hoặc số liệu thật cho thấy 1 node không đạt p95 < 200 ms ở đỉnh, hoặc cần deploy không gián đoạn |
| **Sau** | Kubernetes managed, autoscale, read replica, analytics tách riêng | Khi có đội vận hành |

Công cụ deploy: Kamal 2 hoặc Dokploy (chọn khi dựng staging). Không dùng `drizzle-kit push` trên staging/production; migration chạy bằng `bun run db:migrate` **trước** khi deploy app, và phải tương thích ngược với bản app đang chạy ([engineering/data-model.md §6](../engineering/data-model.md#6-migration-và-seed)).

## 3. Vị trí hạ tầng

- **Khuyến nghị:** DB chứa PII và dịch vụ chính đặt **tại Việt Nam** (VNG Cloud, Viettel Cloud, FPT Cloud…): độ trễ thấp cho người chơi và giảm nghĩa vụ hồ sơ chuyển dữ liệu ra nước ngoài theo Luật 91/2025 (cần luật sư xác nhận, xem [business/compliance.md](../business/compliance.md)).
- Asset tĩnh (không PII) phân phối qua Cloudflare CDN.
- Phương án thay thế: AWS `ap-southeast-1` (Singapore) nếu cần dịch vụ managed phong phú hơn, kèm hồ sơ chuyển dữ liệu xuyên biên giới.

## 4. CI

`.github/workflows/ci.yml`, chạy trên mọi push/PR:

1. **`check`**: `bun install --frozen-lockfile` → `bun run lint` → `bun run db:migrate` → `bunx turbo run typecheck test build`.
2. **`e2e`** (sau `check`): migrate + seed → Playwright; report lưu 7 ngày.
3. **`docker`** (sau `check`, song song với `e2e`): build image cho 5 app (`api`, `worker`, `studio`, `play`, `web`), cache GHA, **không push**.

Còn thiếu (đích): push image lên GHCR khi merge `main`, job deploy staging tự động, deploy production bằng tay có xác nhận.

## 5. Docker image

| Image | Dockerfile | Runtime |
|---|---|---|
| `api`, `worker` | `infra/docker/Dockerfile.nest` | `turbo prune` → `bun build` → `oven/bun:1.4.4-slim`, chạy `bun dist/main.js` |
| `studio`, `play`, `web` | `infra/docker/Dockerfile.next` | `turbo prune` → `next build` (standalone) → `node:<NODE_VERSION>-slim`, chạy `node <APP_DIR>/server.js` |

Biến `NEXT_PUBLIC_*` (ví dụ `NEXT_PUBLIC_API_URL`) truyền bằng build-arg vì Next nhúng lúc build.

```bash
docker build -f infra/docker/Dockerfile.nest --build-arg APP=@playora/api --build-arg APP_DIR=apps/api -t playora-api .
```

## 6. Biến môi trường và bí mật

- Schema env theo app ở `packages/env` (zod); app crash ngay khi thiếu biến. Danh sách mẫu ở `.env.example`: `DATABASE_URL`, `REDIS_URL`, `API_PORT`, `API_PUBLIC_URL`, `PLAY_URL`, `STUDIO_ORIGINS`, `BETTER_AUTH_SECRET`, `PLAYER_SESSION_SECRET`, `WORKER_HEALTH_PORT`, `NEXT_PUBLIC_API_URL`, `SMTP_*`, `GOOGLE_CLIENT_*`.
- Production bắt buộc secret tường minh; app từ chối secret mặc định của dev.
- Bí mật nằm trong secret của công cụ deploy (Kamal secrets hoặc tương đương), không bao giờ commit `.env`. Xoay `BETTER_AUTH_SECRET`, `PLAYER_SESSION_SECRET` khi nghi lộ (xoay `PLAYER_SESSION_SECRET` làm mọi người chơi phải join lại).

## 7. Sao lưu và khôi phục

- Postgres: PITR 7 ngày + snapshot hằng ngày giữ 30 ngày `[GĐ]`.
- Object storage: bật versioning cho bucket asset.
- **Diễn tập khôi phục** trước chương trình thật đầu tiên, sau đó mỗi quý; ghi thời gian khôi phục thực tế vào [runbook.md](./runbook.md).

## 8. Cửa sổ đóng băng (freeze window)

Không deploy production từ **2 giờ trước đến 1 giờ sau** các mốc được đánh dấu quan trọng (`events.is_critical`): giờ mở chương trình lớn, giờ bốc thăm cuối chương trình. Hotfix trong cửa sổ này chỉ khi đang phát sai giải hoặc sập, và phải ghi lại trong runbook.
