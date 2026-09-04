// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  nitro: {
    // 배포 대상은 Cloudflare Workers 하나뿐이므로 프리셋을 여기에 고정합니다.
    // 이렇게 해 두면 `npm run build` / `npm run build:cf` / Cloudflare Workers Builds 의
    // 기본 빌드 명령 중 무엇으로 빌드해도 항상 Workers 산출물이 나옵니다.
    // (고정하지 않으면 node-server 프리셋으로 빌드되어 wrangler deploy 가 깨집니다)
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    },
    routeRules: {
      // 배포 후에도 오래된 HTML이 캐시되어 "없는 _nuxt 청크"를 요청하는 문제를 줄입니다.
      // - HTML/페이지 응답: 캐시 금지(항상 최신 배포를 받게)
      // - _nuxt 정적 자산: 장기 캐시(파일명 해시로 안전)
      '/**': {
        headers: {
          'cache-control': 'no-store'
        }
      },
      '/_nuxt/**': {
        headers: {
          'cache-control': 'public, max-age=31536000, immutable'
        }
      }
    }
  },
  runtimeConfig: {
    // 서버 전용 세션 서명 키. Cloudflare 대시보드의 Secret 으로 주입하세요.
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    public: {
      appName: 'BITPLAY'
    }
  }
})
