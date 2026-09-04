-- 관리자 수익/손실 이벤트를 모든 회원 차트에 공유하기 위한 테이블
-- 킬UP/킬DOWN(trae_kill_events)과 동일하지만, 목표가에 도달한 뒤 짧게 복귀하는 대신
-- hold_ms(유지 시간)만큼 그 상태를 유지한 뒤 복귀한다.
-- Supabase SQL Editor에서 1회 실행하세요.

create table if not exists public.trae_profit_events (
  id bigint primary key,
  symbol text not null,
  direction text not null,
  percent numeric not null,
  base_price numeric not null,
  shocked_price numeric not null,
  duration_ms integer not null default 1000,
  tick_count integer not null default 3,
  hold_ms integer not null default 3000,
  created_at timestamptz not null default now()
);

create index if not exists trae_profit_events_symbol_idx on public.trae_profit_events (symbol, id desc);
