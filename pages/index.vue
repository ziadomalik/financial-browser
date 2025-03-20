<template>
  <div class="w-full h-full flex">
    <div class="w-1/2 h-full overflow-hidden">
      <div class="h-full flex flex-col p-6 items-center justify-center">
        <img src="~/assets/images/six-logo.png" alt="logo" class="w-[100px] mb-6">
        <!-- <HomeInput class="mb-5" /> -->
        <HomeInput />
        <!-- <div class="overflow-y-auto max-h-[60vh] w-full">
          <HomeFeed />
        </div> -->
      </div>
    </div>
    <div class="w-1/2 h-full relative flex flex-col items-center justify-center">
      <div class="absolute left-0 top-1/2 -translate-y-1/2 h-[30vh] border-l-4 rounded-full border-[#E9887580]/50"></div>
      <div class="flex flex-col items-center justify-center">
        <span class="text-2xl font-bold mb-4 text-[#DE3819]">SIXSense</span>
        <SenseLogo :animation="true" />
      </div>
    </div>
  </div>
  <SocketExample class="mt-4" />
</template>

<script setup lang="ts">
import SocketExample from '~/components/SocketExample.client.vue'

const supabase = useSupabaseClient()

const logout = async () => {
    await supabase.auth.signOut()
    navigateTo('/auth')
}
</script>