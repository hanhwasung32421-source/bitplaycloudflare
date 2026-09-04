# 배포 키(Secrets) 설정 가이드

`SUPABASE_SERVICE_ROLE_KEY`는 **절대 GitHub에 커밋하면 안 됩니다.**

## 왜 GitHub에 올리면 안 되나요?

`service_role` 키는 Supabase의 **최고 권한** 키라서, 유출되면 DB 전체가 조작/삭제될 수 있습니다.

## 안전한 저장 위치

아래 중 하나로 넣어야 합니다.

1. 배포 플랫폼의 `Environment Variables` / `Secrets`
2. GitHub Actions를 쓰는 경우 `Repository → Settings → Secrets and variables → Actions → New repository secret`

## 필요한 환경변수

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용 secret)
- `SUPABASE_APP_DB_ENABLED=1`

## 로컬 개발

로컬에서만 테스트하려면 `.env` 파일을 만들고 `.env.example`을 복사해서 사용하세요.

- `.env`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

