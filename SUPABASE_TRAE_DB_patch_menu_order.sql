-- 관리자 상단 메뉴 표시 순서 저장용 컬럼
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_system_settings
  add column if not exists menu_order jsonb not null default '[]'::jsonb;
