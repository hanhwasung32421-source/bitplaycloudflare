-- ============================================================
-- BITPLAY - Cloudflare D1 초기 스키마
--
-- 출처: server/utils/db.ts 의 CREATE TABLE + 런타임 ALTER 마이그레이션을
--       전부 반영한 "최종 형태" 입니다.
--       (Supabase 용 SUPABASE_*.sql 은 Postgres 문법이라 D1 에서 사용 불가)
--
-- 적용:
--   npx wrangler d1 execute bitplay-db --remote --file=./migrations/0001_init.sql
-- 또는 Cloudflare 대시보드 -> Storage & Databases -> D1 -> 콘솔에 붙여넣기
-- ============================================================


-- =============== 사용자 / 인증 ===============

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  birth_date TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  account_holder TEXT NOT NULL DEFAULT '',
  referral_code TEXT NOT NULL DEFAULT '',
  terms_agreed_at TEXT NULL,
  password_reset_required INTEGER NOT NULL DEFAULT 0,
  password_reset_notice_dismissed_at TEXT NULL,
  role TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);


-- 세션은 KV(SESSIONS 바인딩)로 옮기는 것을 권장합니다.
-- KV 는 TTL 자동 만료가 있어 별도 청소가 필요 없습니다.
-- 아래 테이블은 D1 만으로 갈 경우를 위한 것입니다.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);


-- =============== 잔고 / 거래 ===============

CREATE TABLE IF NOT EXISTS balances (
  user_id INTEGER PRIMARY KEY,
  usdt REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  qty REAL NOT NULL,
  entry_price REAL NOT NULL,
  leverage INTEGER NOT NULL,
  margin REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol  ON positions(symbol);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  qty REAL NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL NOT NULL,
  leverage INTEGER NOT NULL,
  pnl REAL NOT NULL,
  liquidation INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trades_user_created ON trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_created_at   ON trades(created_at DESC);

CREATE TABLE IF NOT EXISTS profit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  trade_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profit_cards_user_id  ON profit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_cards_trade_id ON profit_cards(trade_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  trade_percent INTEGER NOT NULL DEFAULT 50,
  trade_leverage INTEGER NOT NULL DEFAULT 100,
  chart_prefs TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);


-- =============== 메시지 / 상담 ===============
-- id 는 애플리케이션이 직접 부여합니다. AUTOINCREMENT 를 붙이지 마세요.

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  thread_key TEXT NOT NULL,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  read_at TEXT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_thread_key ON messages(thread_key, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient  ON messages(recipient_id, read_at);

-- 비회원 방문자가 첫화면 "실시간 상담"에서 admin 과 나누는 대화.
-- guest_id 는 방문자 브라우저에 저장된 임의 코드(로그인 계정과 무관).
CREATE TABLE IF NOT EXISTS guest_chats (
  id INTEGER PRIMARY KEY,
  guest_id TEXT NOT NULL,
  ip TEXT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guest_chats_guest_id ON guest_chats(guest_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guest_chats_sender   ON guest_chats(sender, read_at);


-- =============== 시스템 설정 ===============
-- 항상 id = 1 단일 행으로 사용합니다.

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY,
  liquidation_roe REAL NOT NULL DEFAULT -40,
  telegram_url TEXT NOT NULL DEFAULT '',
  krw_per_usdt REAL NOT NULL DEFAULT 0,
  loss_settlement_percent REAL NOT NULL DEFAULT 0,
  referral_settlement_percent REAL NOT NULL DEFAULT 0,
  krw_auto_rate REAL NOT NULL DEFAULT 0,
  krw_auto_rate_day TEXT NOT NULL DEFAULT '',
  krw_auto_rate_updated_at TEXT NULL,
  menu_order TEXT NOT NULL DEFAULT '',
  main_nav_order TEXT NOT NULL DEFAULT '',
  main_nav_hidden TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);


-- =============== 입출금 / 권한 ===============

CREATE TABLE IF NOT EXISTS deposit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'deposit',    -- 'deposit' | 'withdrawal'
  krw_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  usdt_amount REAL,
  rate_used REAL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user   ON deposit_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status, created_at DESC);

-- sort_order = 화면 표시 순서, tier = 실제 권한 등급(중복 가능, 낮을수록 상위)
CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  menus TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  tier INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_roles_sort ON admin_roles(sort_order, created_at);


-- =============== 킬 / 수익 이벤트 ===============

CREATE TABLE IF NOT EXISTS kill_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  percent REAL NOT NULL,
  base_price REAL NOT NULL,
  shocked_price REAL NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 1000,
  tick_count INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kill_events_symbol ON kill_events(symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS profit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  percent REAL NOT NULL,
  base_price REAL NOT NULL,
  shocked_price REAL NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 1000,
  tick_count INTEGER NOT NULL DEFAULT 3,
  hold_ms INTEGER NOT NULL DEFAULT 3000,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profit_events_symbol ON profit_events(symbol, created_at DESC);


-- =============== 비밀번호 재설정 ===============
-- id 는 애플리케이션이 직접 부여합니다.

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username_snapshot TEXT NOT NULL,
  requested_name TEXT NOT NULL DEFAULT '',
  requested_birth_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by INTEGER NULL,
  message_id INTEGER NULL,
  requested_at TEXT NOT NULL,
  approved_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_prr_user   ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prr_status ON password_reset_requests(status, requested_at DESC);
