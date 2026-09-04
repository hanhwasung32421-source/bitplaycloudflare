-- 킬UP/킬DOWN 애니메이션 속도(몇 초에 몇 틱)를 관리자가 조절할 수 있게 컬럼 추가
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_kill_events
  add column if not exists duration_ms integer not null default 1000;

alter table public.trae_kill_events
  add column if not exists tick_count integer not null default 3;
