# Cloudflare 배포 가이드

배포 주소: **https://bitplay.hanhwasung32421.workers.dev**

기존 `깃푸시 → Vercel → Supabase` 구조에서 `깃푸시 → Cloudflare Workers → D1` 로 전환 완료.

---

## 1. 현재 구성

| 항목 | 값 |
|---|---|
| Worker | `bitplay` |
| D1 데이터베이스 | `bitplay-db` (위치 APAC / 서울권) |
| KV 네임스페이스 | `SESSIONS` (예약, 현재는 세션도 D1 사용) |
| 정적 자산 | Workers Assets (`env.ASSETS`) |
| 시크릿 | `SESSION_SECRET` |

바인딩 정의는 [wrangler.jsonc](wrangler.jsonc) 한 곳에만 있습니다.

---

## 2. 자주 쓰는 명령

> PowerShell 실행 정책 때문에 `npx` 가 막히면 `node ./node_modules/wrangler/bin/wrangler.js` 로 부르세요.

```bash
npm run dev          # 로컬 개발 (Nuxt)
npm run build:cf     # Cloudflare 프리셋으로 빌드
npm run preview:cf   # 로컬 workerd 에서 실행 (실제 Workers 런타임 + 로컬 D1)
npm run deploy:cf    # 빌드 + 배포
```

배포 후 확인:

```bash
bash scripts/smoke.sh https://bitplay.hanhwasung32421.workers.dev
```

---

## 3. 데이터베이스

스키마와 시드는 SQL 파일로 관리합니다. 코드가 부팅할 때 테이블을 만들지 않습니다.

| 파일 | 내용 |
|---|---|
| [migrations/0001_init.sql](migrations/0001_init.sql) | 테이블 15개 + 인덱스 21개 |
| [migrations/0002_seed.sql](migrations/0002_seed.sql) | 시스템설정, admin 계정, 기본 역할 |

적용:

```bash
node ./node_modules/wrangler/bin/wrangler.js d1 execute bitplay-db --remote --file=./migrations/0001_init.sql
```

로컬(miniflare)에 넣을 때는 `--remote` 대신 `--local` 을 씁니다.

조회 예시:

```bash
node ./node_modules/wrangler/bin/wrangler.js d1 execute bitplay-db --remote --command="SELECT id, username, role FROM users;"
```

### 스키마를 바꿀 때

1. `migrations/` 에 `0003_<이름>.sql` 을 새로 만든다 (기존 파일 수정 금지)
2. `--local` 로 먼저 적용해 `npm run preview:cf` 로 확인
3. `--remote` 로 적용
4. 코드에서 새 컬럼을 쓴다

---

## 4. 폴더 구조

수정할 때 어디를 건드려야 하는지가 명확하도록 계층을 나눠 두었습니다.

```
server/
  db/                  DB 계층 — 여기만 D1 을 안다
    binding.ts           Cloudflare 바인딩 접근 (globalThis.__env__)
    statement.ts         D1 문 어댑터 (get/all/run)
    client.ts            getDb()
    index.ts             공개 API
  upstream/            외부 API 호출 계층
    okx-fetch.ts         OKX REST — 캐시/재시도/스테일 폴백
  utils/               도메인 로직 (기존 위치 유지)
    db.ts                → server/db 재수출 파사드 (import 경로 호환용)
    supabase.ts          no-op 스텁 (아래 참고)
    supa-appdb.ts        no-op 스텁
    supa-log.ts          no-op 스텁
  api/                 HTTP 엔드포인트 76개
  legacy/              Supabase 시절 원본 (.bak, 빌드 제외)
app/
  utils/okxClient.ts   브라우저에서 OKX 직접 호출 (+ 서버 프록시 폴백)
migrations/            D1 스키마/시드 SQL
scripts/               운영 스크립트 (smoke.sh 등)
```

### 규칙

- **DB 를 쓰는 코드는 `getDb()` 만 사용한다.** `globalThis.__env__` 를 직접 만지지 마세요.
  바인딩 접근 방식이 바뀌어도 `server/db/binding.ts` 한 파일만 고치면 됩니다.
- **모든 DB 호출은 `await` 가 필요합니다.** D1 은 비동기입니다.
  ```ts
  const row = await db.prepare('SELECT ...').get(id)
  const rows = await db.prepare('SELECT ...').all()
  await db.prepare('UPDATE ...').run(a, b)
  ```
- **OKX 는 서버에서 `server/upstream/okx-fetch.ts`, 브라우저에서 `app/utils/okxClient.ts` 만 거친다.**
  직접 `$fetch('https://www.okx.com/...')` 를 쓰면 429 방어가 전부 우회됩니다.

---

## 5. Supabase 잔재에 대해

호출부 43개 파일을 건드리지 않으려고, Supabase 관련 모듈을 지우는 대신
**no-op 스텁**으로 바꿨습니다. `supabaseAppDbEnabled()` 가 항상 `false` 이므로

```ts
if (supabaseAppDbEnabled()) { ...Supabase... }   // 절대 실행되지 않음
const db = getDb()                               // 항상 이쪽으로 흐름
```

이 됩니다. `@supabase/supabase-js` 는 더 이상 import 되지 않아 번들에서도 빠졌습니다
(1.98MB → 1.58MB).

죽은 분기를 실제로 걷어내고 싶다면 한 파일씩 지우면 되고, 그 사이에도 동작은 동일합니다.
원본은 `server/legacy/*.bak` 에 있습니다.

---

## 6. OKX 429 문제 (해결됨)

Cloudflare Workers 는 egress IP 를 여러 워커가 공유합니다. 그래서 서버가 OKX 를
대신 호출하면 OKX 가 429 로 막습니다. 실측: `/api/okx/candles` 연속 호출의 24~35% 가 429.

해결:

1. **차트/호가는 브라우저가 OKX 를 직접 호출** (`app/utils/okxClient.ts`).
   사용자마다 자기 IP 를 쓰므로 공유 IP 문제가 사라집니다. 실측 30/30 성공.
   실시간 시세 WebSocket 이 이미 같은 방식이라 구조도 일관됩니다.
2. 브라우저 쪽에도 요청 간격 제한(150ms) + 429 백오프를 둡니다.
3. 그래도 실패하면 서버 프록시로 폴백 (사내망에서 okx.com 이 막힌 경우 대비).
4. 서버가 직접 시세를 봐야 하는 경로(포지션 개시/청산)는 `okx-fetch.ts` 가
   캐시 + 재시도 + 스테일 폴백으로 방어합니다.

---

## 7. 계정

| 용도 | 아이디 | 비밀번호 |
|---|---|---|
| 총관리자 | `admin` | `1121` |
| 테스트 사용자 | `demo0904` | `Test1234!` (잔고 10,000 USDT) |

> admin 비밀번호는 기존 코드와 동일한 값입니다. 실서비스 전에 바꾸세요.
> 변경용 SQL 은 `migrations/0002_seed.sql` 맨 아래 주석에 있습니다.

---

## 8. 깃 푸시 → 자동 배포

현재는 로컬에서 `npm run deploy:cf` 로 배포합니다. 푸시 자동배포를 켜려면 둘 중 하나:

**A. Workers Builds (권장)** — 대시보드 → Compute (Workers) → `bitplay` → Settings → Build
- Repository: `hanhwasung32421-source/bitplaycloudflare`
- Build command: `npm run build:cf`
- Deploy command: `npx wrangler deploy`

**B. GitHub Actions** — [.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml) 이 이미 있습니다.
저장소 Settings 에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (Secrets) 와
`DEPLOY_VIA_ACTIONS=true` (Variables) 를 추가하면 켜집니다.

---

## 9. 아직 남은 것

- **cron**: `vercel.json` 의 환율 자동 갱신(`/api/cron/refresh-krw-rate`)은 이전하지 않았습니다.
  Workers cron 은 HTTP 라우트가 아니라 `scheduled()` 핸들러를 부르므로 Nitro Tasks 연결이 필요합니다.
  환율은 관리자 화면에서 수동 설정할 수 있어 당장 막히는 기능은 없습니다.
- **세션 KV 이전**: `SESSIONS` 네임스페이스는 만들어 두었지만 세션은 아직 D1 에 있습니다.
  트래픽이 늘면 KV 로 옮기는 편이 D1 읽기 부담을 줄여 줍니다.
