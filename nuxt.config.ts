// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  nitro: {
    experimental: {
      websocket: true
    }
  },
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    // 'nuxt-socket-io', // Removed as we're using Nitro's WebSocket support
  ],

  // Basic build configuration
  build: {
    transpile: ['socket.io-client']
  },

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
    apiBaseUrl: process.env.API_BASE_URL,
    finnhubApiKey: process.env.FINNHUB_API_KEY,
  },

  // Explicitly set the port
  devServer: {
    port: 3000
  },
})