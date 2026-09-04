# Vercel 환경변수 등록

1. 프로젝트 루트에서 한 번만 Vercel 로그인

```powershell
vercel login
```

2. 프로젝트 연결이 안 되어 있으면 한 번만 링크

```powershell
vercel link
```

3. Supabase SQL 실행

- `SUPABASE_TRAE_DB_v2.sql` 파일 내용을 Supabase SQL Editor에서 실행

4. `.env` 값을 Vercel에 등록

```powershell
pwsh -File .\setup-vercel-env.ps1
```

개발 환경까지 같이 넣으려면:

```powershell
pwsh -File .\setup-vercel-env.ps1 -IncludeDevelopment
```

5. 등록 후 Redeploy

```powershell
vercel --prod
```

## 등록되는 키

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_APP_DB_ENABLED`
- `SESSION_SECRET`
