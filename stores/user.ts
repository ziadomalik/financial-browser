import { defineStore } from 'pinia'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null as any,
        isLoading: false,
        token: null as string | null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.user,
        userId: (state) => state.user?.id || null,
    },

    actions: {
        async init() {
            const supabase = useSupabaseClient()
            const supabaseUser = useSupabaseUser()

            // If we have a Supabase user, update our local state
            if (supabaseUser.value) {
                this.user = supabaseUser.value

                // Get a JWT token for socket authentication
                const { data, error } = await supabase.auth.getSession()
                if (!error && data?.session?.access_token) {
                    this.token = data.session.access_token
                }
            } else {
                this.user = null
                this.token = null
            }
        },

        async signOut() {
            const supabase = useSupabaseClient()
            await supabase.auth.signOut()
            this.user = null
            this.token = null
        }
    }
}) 