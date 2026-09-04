-- ============================================================
-- BITPLAY - Cloudflare D1 초기 시드
--
-- server/utils/db.ts 의 getDb() 안에서 하던 초기 시드를 SQL 로 옮긴 것입니다.
-- 0001_init.sql 을 먼저 적용한 뒤 실행하세요.
--
-- 적용:
--   npx wrangler d1 execute bitplay-db --remote --file=./migrations/0002_seed.sql
--
-- !!! 경고 !!!
-- 아래 admin 계정의 비밀번호는 기존 코드와 동일한 '1121' 입니다.
-- 실서비스 배포 전에 반드시 변경하세요. (맨 아래 안내 참고)
-- ============================================================


-- 1) 시스템 설정 단일 행 (강제청산 기준 -40%)
INSERT OR IGNORE INTO system_settings (id, liquidation_roe, updated_at)
VALUES (1, -40, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));


-- 2) 총관리자 계정  (admin / 1121)
INSERT OR IGNORE INTO users (
  username, password_hash, name, birth_date,
  bank_name, bank_account, account_holder, referral_code,
  terms_agreed_at, password_reset_required, password_reset_notice_dismissed_at,
  role, permissions, created_at, updated_at
) VALUES (
  'admin',
  '$2b$10$/tf3HQA1EcDTvive9gA.H.a5M3bPdcmYfP8eJsM4B6dfONEKtF.Tm',
  '', '',
  '', '', '', '',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, NULL,
  'super_admin',
  '{"all":true,"canCredit":true}',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);


-- 3) 총관리자 잔고 행
INSERT OR IGNORE INTO balances (user_id, usdt)
SELECT id, 0 FROM users WHERE username = 'admin';


-- 4) 기본 부어드민 역할
--    menus 는 ADMIN_MENU_KEYS 8개 전부 view=true / edit=false 로 시작합니다.
INSERT OR IGNORE INTO admin_roles (id, label, menus, sort_order, tier, created_at)
VALUES (
  'branch_admin',
  '부어드민',
  '{"members":{"view":true,"edit":false},"online":{"view":true,"edit":false},"trades":{"view":true,"edit":false},"transfers":{"view":true,"edit":false},"positions":{"view":true,"edit":false},"messages":{"view":true,"edit":false},"settlement":{"view":true,"edit":false},"deposits":{"view":true,"edit":false}}',
  0,
  0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);


-- ============================================================
-- admin 비밀번호 변경 방법
--
-- 1) 로컬에서 새 해시 생성:
--      node -e "console.log(require('bcryptjs').hashSync('새비밀번호', 10))"
--
-- 2) 출력된 해시로 교체 실행:
--      UPDATE users
--         SET password_hash = '<1단계에서 나온 해시>',
--             updated_at    = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
--       WHERE username = 'admin';
-- ============================================================
