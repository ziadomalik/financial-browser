// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/supabase'
  ],

  shadcn: { prefix: 'S' },

  supabase: {
    redirectOptions: {
      login: '/auth',
      exclude: ['/auth/*'],
      callback: '/auth/confirm',
    }
  },

  // Runtime config for API endpoints
  runtimeConfig: {
    public: {
      apiBaseUrl: 'https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io'
    }
  }
})