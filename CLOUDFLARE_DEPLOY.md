# Cloudflare Workers 배포

## 현재 상태

| 항목 | 상태 |
|---|---|
| `cloudflare_module` 프리셋 빌드 | ✅ 통과 |
| 정적 자산 / SSR 렌더링 | ✅ 동작 |
| OKX 시세 (브라우저 → `wss://ws.okx.com` 직결) | ✅ 서버 WS 불필요 |
| DB를 쓰는 API 라우트 | ❌ **런타임 500** |

실측 오류 (`wrangler dev`, `POST /api/auth/register`):

```
Error: No such module "node:sqlite".
    at getDb (.output/server/chunks/_/nitro.mjs)
POST /api/auth/register 500 Server Error
```

`server/utils/db.ts` 가 `node:sqlite` + 로컬 파일시스템에 의존합니다.
Workers 에는 둘 다 없습니다. **D1 전환 전까지 배포해도 절반은 500** 입니다.

## 배포 자동화 설정 (택 1)

### A. Workers Builds — 권장

Cloudflare 대시보드에서 GitHub 저장소를 연결하면 push 마다 자동 빌드/배포됩니다.
API 토큰을 어디에도 저장하지 않아도 되고, 브랜치별 프리뷰 URL이 붙습니다.

1. Cloudflare 대시보드 → **Compute (Workers)** → **Create** → **Import a repository**
2. `hanhwasung32421-source/bitplaycloudflare` 선택
3. 빌드 설정:
   - Build command: `npm run build:cf`
   - Deploy command: `npx wrangler deploy`
   - Version command: (비움)
4. **Settings → Variables and Secrets** 에 아래를 Secret 으로 등록:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `SUPABASE_APP_DB_ENABLED`

### B. GitHub Actions

`.github/workflows/deploy-cloudflare.yml` 가 이미 있습니다. 기본은 비활성입니다.

1. 저장소 **Settings → Secrets and variables → Actions**
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
   - Variables: `DEPLOY_VIA_ACTIONS` = `true`
2. 이후 `main` push 마다 배포됩니다.

## 로컬 명령

```bash
npm run build:cf     # Workers 프리셋으로 빌드
npm run preview:cf   # 로컬 workerd 에서 실행 (실제 Workers 런타임)
npm run deploy:cf    # 빌드 + 배포
```

## 남은 작업 — D1 전환

`server/utils/db.ts` 의 `CREATE TABLE` 15개가 **이미 SQLite 문법**이라 D1 마이그레이션으로
그대로 재사용할 수 있습니다. (`SUPABASE_*.sql` 은 Postgres 문법이라 사용 불가)

1. `npx wrangler d1 create bitplay-db` → `wrangler.jsonc` 의 `d1_databases` 주석 해제
2. `npx wrangler kv namespace create SESSIONS` → `kv_namespaces` 주석 해제
3. `db.ts` 를 `env.DB` 기반 어댑터로 재작성
4. `getDb()` 를 쓰는 43개 파일을 동기 → 비동기 전환
   (`db.prepare().get()/all()/run()` → `await env.DB.prepare().first()/all()/run()`)
5. `sessions` 테이블 → KV (TTL 자동 만료)
6. Supabase 미러 레이어 제거 (`supa-appdb.ts`, `supabase.ts`, `server/plugins/20-supabase-appdb.ts`)
7. Supabase `trae_*` 데이터 → CSV → `npx wrangler d1 import`

## cron

`vercel.json` 의 `/api/cron/refresh-krw-rate` 는 Workers 로 그대로 넘어가지 않습니다.
Workers cron 은 HTTP 라우트가 아니라 `scheduled()` 핸들러를 호출하므로,
Nitro Tasks 를 붙인 뒤 `wrangler.jsonc` 의 `triggers` 를 활성화하세요.
