import { useSupabaseClient } from '#imports'

export default defineNuxtRouteMiddleware(async (to, from) => {
    const supabase = useSupabaseClient()

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()

    // If the user is not authenticated and trying to access a page other than auth
    if (!session && to.path !== '/auth') {
        return navigateTo('/auth')
    }

    // If the user is authenticated and trying to access auth page
    if (session && to.path === '/auth') {
        return navigateTo('/')
    }
}) 