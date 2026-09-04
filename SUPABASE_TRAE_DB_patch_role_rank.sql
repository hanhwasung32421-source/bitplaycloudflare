-- 역할 서열(우선순위) 순서 저장용 컬럼
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_admin_roles
  add column if not exists sort_order integer not null default 0;
