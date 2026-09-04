-- 입금요청 테이블을 입금/출금 공용으로 확장(type 컬럼 추가)
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_deposit_requests
  add column if not exists type text not null default 'deposit';
