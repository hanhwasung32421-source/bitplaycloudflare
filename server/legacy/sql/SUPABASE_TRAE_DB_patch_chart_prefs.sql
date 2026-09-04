-- 기존 trae_user_settings 테이블이 구버전 스키마일 때 실행
-- 목적: chart_prefs 컬럼이 없어서 회원가입/설정 저장 시 500 나는 문제 보정

alter table public.trae_user_settings
add column if not exists chart_prefs jsonb not null default '{}'::jsonb;
