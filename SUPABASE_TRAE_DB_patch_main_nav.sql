-- 최상단 메인 메뉴(코인선물/해외주식/국내주식/마켓/내지갑/투자내역/고객센터) 순서·숨기기 설정.
-- main_nav_hidden의 기본값은 반드시 NULL이어야 한다("아직 설정한 적 없음"과 "전부 표시로 저장함"을
-- 구분하기 위함 — NULL이면 서버가 기본 숨김 목록(투자내역)을 적용하고, 빈 배열이면 전부 표시로 취급한다).
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_system_settings
  add column if not exists main_nav_order jsonb not null default '[]'::jsonb;

alter table public.trae_system_settings
  add column if not exists main_nav_hidden jsonb default null;
