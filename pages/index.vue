<template>
    <div>
        <SButton variant="destructive" @click="logout">Logout</SButton>
    </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()

const logout = async () => {
    await supabase.auth.signOut()
    navigateTo('/auth')
}
</script>