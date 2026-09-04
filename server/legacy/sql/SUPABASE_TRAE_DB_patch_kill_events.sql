-- 관리자 킬UP/킬DOWN 이벤트를 모든 회원 차트에 공유하기 위한 테이블
-- Supabase SQL Editor에서 1회 실행하세요.

create table if not exists public.trae_kill_events (
  id bigint primary key,
  symbol text not null,
  direction text not null,
  percent numeric not null,
  base_price numeric not null,
  shocked_price numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists trae_kill_events_symbol_idx on public.trae_kill_events (symbol, id desc);
