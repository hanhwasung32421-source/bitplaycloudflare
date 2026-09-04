-- 매일 오전 9시(KST)에 고정하는 자동 원/USDT 환율 캐시용 컬럼 추가
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_system_settings
  add column if not exists krw_auto_rate numeric not null default 0;

alter table public.trae_system_settings
  add column if not exists krw_auto_rate_day text not null default '';

alter table public.trae_system_settings
  add column if not exists krw_auto_rate_updated_at timestamptz;
