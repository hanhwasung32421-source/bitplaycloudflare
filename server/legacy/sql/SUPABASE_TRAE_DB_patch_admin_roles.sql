-- 역할별 관리자 메뉴 권한 기능용 테이블
-- Supabase SQL Editor에서 1회 실행하세요.

create table if not exists public.trae_admin_roles (
  id text primary key,
  label text not null,
  menus jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
