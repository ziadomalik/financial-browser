<template>
  <div class="w-full h-full flex flex-col">
    <!-- Left side content -->
    <div class="w-1/2 h-full overflow-hidden">
      <div class="h-full flex flex-col p-6 items-center justify-center">
        <img src="~/assets/images/six-logo.png" alt="logo" class="w-[100px] mb-6">
        
        <!-- Search input with fixed width and centering -->
        <div class="w-full flex justify-center mb-5">
          <HomeInput />
        </div>
        
        <!-- Add automatic visualizations component -->
        <div class="overflow-y-auto max-h-[60vh] w-full">
          <HomeAutomaticVisualizations />
        </div>
      </div>
    </div>

    <!-- Right side content -->
    <div class="w-1/2 h-full relative flex flex-col items-center justify-center">
      <div class="absolute left-0 top-1/2 -translate-y-1/2 h-[30vh] border-l-4 rounded-full border-[#E9887580]/50"></div>
      <div class="flex flex-col items-center justify-center">
        <span class="text-2xl font-bold mb-4 text-[#DE3819]">SIXSense</span>
        <SenseLogo @click="startAudio" :animation="true" />
      </div>
    </div>
    
    <!-- Recording overlay -->
    <div v-if="isRecording" class="fixed inset-0 bg-white/80 z-50 flex items-center justify-center transition-opacity duration-300">
      <button @click="stopAudio" class="absolute top-6 left-6 text-white hover:text-red-400 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="flex flex-col items-center">
        <SenseLogo :animation="true" class="recording-logo" />
        <div class="mt-6 text-white flex items-center">
          <span class="recording-indicator mr-2"></span>
          <span class="text-[#DE3819]">Recording...</span>
        </div>
      </div>
    </div>
    
    <!-- Feed component -->
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