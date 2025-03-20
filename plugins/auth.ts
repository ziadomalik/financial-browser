import { defineNuxtPlugin } from '#app'
import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin(async (nuxtApp) => {
    // Initialize the user store
    const userStore = useUserStore()
    await userStore.init()

    // Watch for auth state changes
    nuxtApp.hook('app:mounted', async () => {
        // Re-initialize when app is mounted 
        await userStore.init()

        // Set up auth state change listener
        const supabase = nuxtApp.$supabase as any

        supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await userStore.init()
            } else if (event === 'SIGNED_OUT') {
                userStore.user = null
                userStore.token = null
            }
        })
    })
}) 