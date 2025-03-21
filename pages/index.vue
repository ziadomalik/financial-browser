<template>
  <div class="w-full h-full flex relative flex-col">
    <div class="flex-1 flex">
      <div class="w-1/2 h-full overflow-hidden">
        <div class="h-full flex flex-col p-6 items-center justify-center">
          <img src="~/assets/images/SIXSense.svg" alt="logo" class="h-12 mb-6 m-4 mx-6">
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
          <span class="text-2xl font-bold mb-4 text-[#DE3819]">Sense</span>
          <SenseLogo @click="startAudio" :animation="true" />
        </div>
      </div>
    </div>
    <HomeFeed />
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const tabsStore = useTabsStore()
const router = useRouter()
const isRecording = ref(false)

const logout = async () => {
    await supabase.auth.signOut()
    navigateTo('/auth')
}

const startAudio = () => {
  console.log('Starting audio recording')
  // Create a new tab for the recording page
  const newTabId = tabsStore.addTab('Recording', { type: 'recording' })
  
  // Navigate to the recording page with the tab ID
  navigateTo(`/recording?tabId=${newTabId}`)
}

const stopAudio = () => {
  isRecording.value = false
}
</script>

<style scoped>
.recording-logo {
  transform: scale(1.3);
  transition: all 0.4s ease-in-out;
}

.recording-indicator {
  width: 12px;
  height: 12px;
  background-color: #DE3819;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}
</style>