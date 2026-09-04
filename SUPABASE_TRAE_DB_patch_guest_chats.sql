-- 비회원(가입 전 방문자)이 첫화면 "실시간 상담"에서 admin과 나누는 대화 저장용 테이블.
-- guest_id는 방문자 브라우저에 저장된 임의 코드로, 로그인 계정과는 무관하다.
-- Supabase SQL Editor에서 1회 실행하세요.

create table if not exists public.trae_guest_chats (
  id bigint primary key,
  guest_id text not null,
  ip text null,
  sender text not null,
  body text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists trae_guest_chats_guest_id_idx on public.trae_guest_chats (guest_id);
create index if not exists trae_guest_chats_created_at_idx on public.trae_guest_chats (created_at);
