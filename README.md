# 거래소 데모 (모의 USDT)

OKX 공개 시세(차트/호가)를 붙이고, 가상 USDT로 모의체결을 할 수 있는 데모 프로젝트입니다.

주의: **실제 USDT 온체인 입금/출금, 실거래 체결 기능은 포함하지 않습니다.**

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## 권장 실행

Nuxt 4 개발서버가 Windows에서 `nuxt-vite` 파이프 오류를 낼 수 있어, 현재는 아래 **빌드 후 실행** 방식을 권장합니다.

```powershell
cd 'c:\trae\베트남\거래소2' ; npm.cmd install ; npm.cmd run build ; npm.cmd run start
```

브라우저:

```text
http://localhost:3000/
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev -- --host 127.0.0.1 --port 3000

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## 기본 계정/흐름

- 메인 사이트: 회원가입/로그인 가능
- 관리자 페이지: 로그인만 가능
  - 기본 총관리자: `admin` / `1121`

## 주요 페이지

- 거래 화면: `/exchange/BTCUSDT`
- 내 계정(잔고/포지션/거래내역): `/me`
- 수익/손실 인증 카드: `/profit`
- 관리자: `/admin`

## 관리자 기능(현재)

- 유저 목록 조회: `/admin/users`
- 가상 USDT 입금(잔고 증가): `/admin/users`에서 사용자별 입금
- 지사 관리자 계정 생성(총관리자만): `/admin` 하단 “지사 계정 생성”

## 데이터 저장

- SQLite 파일: (로컬 Windows) `data/app.db`
- SQLite 파일: (Docker/서버) `/data/app.db` (지속 디스크/볼륨 마운트 권장)
- Supabase(자동 저장): `SUPABASE_EXTRA_TABLES.sql`를 Supabase SQL Editor에서 실행 후 사용

## 배포 시 데이터 유지(중요)

푸시/재배포할 때 유저 데이터가 초기화되는 건 대부분 호스팅이 **컨테이너 파일시스템을 매 배포마다 새로 생성**하기 때문입니다.

해결 방법:

1. 호스팅(Render/Railway/VPS/Docker 등)에서 **Persistent Disk/Volume** 을 추가
2. 그 마운트 경로를 `/data` 로 잡기 (Dockerfile에 `VOLUME /data` 포함)
3. 환경변수 `SQLITE_DIR=/data` 를 유지

이렇게 하면 새 커밋을 배포해도 `app.db`가 유지되어 기존 유저/잔고/거래내역이 유지됩니다.

## 관리자 기본 잔고(데모)

- 총관리자 `admin` 계정은 데모 편의상 USDT가 최소 `10000`이 되도록 시드가 들어갑니다.
- 값을 바꾸려면 배포 환경변수 `SEED_ADMIN_USDT`로 조정할 수 있습니다. (예: `SEED_ADMIN_USDT=50000`)

## Supabase 연결(anon)

- URL: `https://dyfycrmltqosezmsufup.supabase.co`
- anon key: `nuxt.config.ts`의 `public.supabaseAnonKey` 사용 (환경변수 `SUPABASE_ANON_KEY`로 덮어쓸 수 있음)

## Supabase에 회원DB 저장(권장)

회원/잔고/포지션/거래 데이터를 Supabase에 항상 저장(미러/복원)하려면:

1. Supabase SQL Editor에서 `SUPABASE_TRAE_DB.sql` 실행 (테이블명 `trae_` prefix)
2. `SUPABASE_TRAE_DB_patch_system_settings.sql` 실행 (강제청산 기준(%) 저장용 `trae_system_settings` 테이블)
3. `SUPABASE_TRAE_DB_patch_kill_events.sql` 실행 (킬UP/킬DOWN 이력 공유용 `trae_kill_events` 테이블)
4. `SUPABASE_TRAE_DB_patch_kill_events_duration.sql` 실행 (킬 애니메이션 속도(초/틱) 저장용 컬럼 추가)
5. 배포 환경변수 추가:
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
   - `SUPABASE_APP_DB_ENABLED=1`

이 설정이 켜져 있으면 "무조건 Supabase에서 불러오기"로 동작합니다:

- 서버 시작 시 Supabase → 앱 DB로 항상 덮어쓰기 동기화
- 주요 변경(회원가입/입금/포지션/청산/설정 변경)은 Supabase에도 같이 기록

## 강제청산 기준(%) 설정

- 관리자 대시보드(`/admin`, 총관리자만 수정 가능)에서 강제청산 ROE 기준(%)을 조정할 수 있습니다.
- 저장하면 Supabase(`trae_system_settings`, `SUPABASE_APP_DB_ENABLED=1`일 때) 또는 로컬 SQLite에 저장되고,
  모든 유저의 거래 화면이 5초 주기로 이 값을 다시 불러와 실시간으로 반영합니다.
- Supabase 저장을 쓰려면 `SUPABASE_TRAE_DB_patch_system_settings.sql`을 먼저 실행해야 합니다.

## 킬UP / 킬DOWN (총관리자 전용)

- 거래 화면 상단의 킬UP/킬DOWN 버튼은 **총관리자(super_admin)** 에게만 보입니다.
- 누르면 몇 %, 몇 초 동안, 몇 틱에 걸쳐 움직였다가 복귀할지 입력하는 팝업이 뜨고, 확인하면:
  - 그 심볼을 보고 있는 모든 유저의 차트가 지정한 속도로 동일하게 같이 튀었다가 복귀합니다(폴링 방식으로 전파, 최대 1.5초 지연 후 시작).
  - 이동 구간에서 강제청산가에 닿은 포지션은 실제로 강제청산되어 거래내역/잔고에 반영됩니다.
  - 차트에는 텍스트/마커를 남기지 않고, 봉 자체가 튀었다가 원래대로 돌아오는 것만 보입니다.
  - 봉이 원래 자리로 돌아온 뒤에도, 그 순간 찍었던 고가/저가(꼬리)는 실제 봉 기록으로 남습니다.
  - 이벤트는 Supabase(`trae_kill_events`, `SUPABASE_APP_DB_ENABLED=1`일 때) 또는 로컬 SQLite에 저장되어(실시간 전파 + 새로고침 복원용) 모든 유저에게 동일하게 보이고, 새로고침 후에도 그 봉의 고가/저가에 다시 반영됩니다.
- Supabase 저장을 쓰려면 `SUPABASE_TRAE_DB_patch_kill_events.sql`을 먼저 실행해야 합니다.

## GitHub 자동 푸시

원격 저장소:

- `https://github.com/hanhwasung32421-source/usdetrade.git`

한 번만 푸시:

```powershell
cd 'c:\trae\베트남\거래소2' ; .\auto_push.ps1
```

수정될 때마다 자동 감시/푸시:

```powershell
cd 'c:\trae\베트남\거래소2' ; .\watch_push.ps1
```

## 버전 표기

- 우측 상단에 `vYYMMDD.N` 형식으로 표시됩니다. (예: `v260612.1`)
- `auto_push.ps1`/`watch_push.ps1`가 커밋 전에 `version.json`을 자동으로 올립니다.

## 배포

- GitHub Pages에는 이 프로젝트를 그대로 배포할 수 없습니다. 서버 API와 SQLite가 필요하기 때문입니다.
- 대신 GitHub 저장소를 소스로 사용해 Docker 지원 서버(Render, Railway, VPS, Docker 호스팅 등)에 배포할 수 있도록 `Dockerfile`을 포함했습니다.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
