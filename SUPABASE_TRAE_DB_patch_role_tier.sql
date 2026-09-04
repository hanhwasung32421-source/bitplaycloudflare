-- 역할의 실제 "권한 등급"(tier) 저장용 컬럼.
-- sort_order(화면 표시 순서)와 달리 여러 역할이 같은 tier 값을 가질 수 있다 —
-- 같은 등급끼리는 서로 역할을 부여할 수 없고, 자기보다 tier가 더 큰(더 아래) 역할만 부여할 수 있다.
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_admin_roles
  add column if not exists tier integer not null default 0;

update public.trae_admin_roles set tier = sort_order where tier = 0;
