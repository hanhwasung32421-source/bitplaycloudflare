-- 정산내역/입금요청 기능용: system_settings 확장 + 입금요청 테이블
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_system_settings
  add column if not exists telegram_url text not null default '';

alter table public.trae_system_settings
  add column if not exists krw_per_usdt numeric not null default 0;

alter table public.trae_system_settings
  add column if not exists loss_settlement_percent numeric not null default 0;

alter table public.trae_system_settings
  add column if not exists referral_settlement_percent numeric not null default 0;

create table if not exists public.trae_deposit_requests (
  id bigint primary key,
  user_id bigint not null,
  krw_amount numeric not null,
  status text not null default 'pending',
  usdt_amount numeric,
  rate_used numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists trae_deposit_requests_user_idx on public.trae_deposit_requests (user_id, id desc);
