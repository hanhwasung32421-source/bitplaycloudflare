-- 강제청산(%) 기준을 관리자 대시보드에서 조정 가능하게 저장하는 테이블
-- Supabase SQL Editor에서 1회 실행하세요.

create table if not exists public.trae_system_settings (
  id integer primary key,
  liquidation_roe numeric not null default -40,
  updated_at timestamptz not null default now()
);

insert into public.trae_system_settings (id, liquidation_roe)
values (1, -40)
on conflict (id) do nothing;
