<template>
  <div class="w-full h-full flex">
    <div class="w-1/2 h-full overflow-hidden">
      <div class="h-full flex flex-col p-6 items-center justify-center">
        <img src="~/assets/images/six-logo.png" alt="logo" class="w-[100px] mb-6">
        <HomeInput class="mb-5" />
        <div class="overflow-y-auto max-h-[60vh] w-full">
          <HomeFeed />
        </div>
      </div>
    </div>
    <div class="w-1/2 h-full">
      <!-- Right side content -->
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()

const logout = async () => {
    await supabase.auth.signOut()
    navigateTo('/auth')
}
</script>