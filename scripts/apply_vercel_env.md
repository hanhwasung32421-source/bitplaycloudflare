# Vercel 환경변수 적용 방법(파일로 관리)

`SUPABASE_SERVICE_ROLE_KEY`는 **절대 GitHub에 커밋하면 안 됩니다.**

## 1) 로컬 파일 만들기

1. `vercel.env.local.example`을 복사해서 `vercel.env.local` 생성
2. `vercel.env.local`에 실제 값을 채우기

## 2) Vercel CLI로 업로드

프로젝트 루트에서:

```powershell
npm i -g vercel
vercel login

# Production에 적용
powershell -ExecutionPolicy Bypass -File .\scripts\apply_vercel_env.ps1 -Target production

# Preview/Development에 적용하고 싶으면
# powershell -ExecutionPolicy Bypass -File .\scripts\apply_vercel_env.ps1 -Target preview
# powershell -ExecutionPolicy Bypass -File .\scripts\apply_vercel_env.ps1 -Target development
```

## 3) 재배포

Vercel 대시보드에서 Redeploy(재배포) 하면 적용됩니다.

