// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],

  shadcn: { prefix: 'S' },

  supabase: {
    redirectOptions: {
      login: '/auth',
      exclude: ['/auth/*'],
      callback: '/auth/confirm',
    }
  },

  runtimeConfig: {
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    newsApiKey: process.env.NEWS_API_KEY,
  },
})