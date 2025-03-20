<template>
  <div class="relative w-full h-full flex flex-col items-center justify-center bg-white">
    <button @click="stopRecording" class="absolute top-6 left-6 text-gray-700 hover:text-red-600 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
    
    <div class="flex flex-col items-center">
      <SenseLogo :animation="true" :disableHover="true" class="recording-logo" />
      <div class="mt-6 text-gray-800 flex items-center">
        <span class="recording-indicator mt-1 mr-2"></span>
        <span class="text-[#DE3819]">Listening...</span>
      </div>
      <div v-if="transcription" class="mt-8 max-w-md p-4 bg-gray-50 rounded-lg text-gray-800 transcription-container">
        <p class="transcription-text">{{ transcription }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const tabsStore = useTabsStore()
const router = useRouter()

const tabId = route.query.tabId as string
const transcription = ref('')
const audioChunks: Blob[] = []
let mediaRecorder: MediaRecorder | null = null
let isRecording = ref(true)
let recordingInterval: NodeJS.Timeout | null = null

// If no tab ID is provided, redirect to home
if (!tabId) {
  navigateTo('/')
}

// Start recording when component mounts
onMounted(async () => {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // Configure media recorder
    const options = { 
      mimeType: 'audio/webm',
    }
    
    mediaRecorder = new MediaRecorder(stream, options)
    
    // Set up event handlers for audio chunks
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    })
    
    mediaRecorder.addEventListener('stop', async () => {
      // When stopped, process all audio data
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        await sendAudioChunk(audioBlob)
        audioChunks.length = 0 // Clear the chunks
      }
    })
    
    // Start recording
    mediaRecorder.start()
    
    // Set up interval to periodically stop, process, and restart recording
    // This creates complete WebM files every 5 seconds
    recordingInterval = setInterval(() => {
      if (mediaRecorder && isRecording.value) {
        mediaRecorder.stop() // This will trigger the 'stop' event
        
        // Start a new recording session after a short delay
        setTimeout(() => {
          if (isRecording.value && stream.active) {
            mediaRecorder = new MediaRecorder(stream, options)
            
            mediaRecorder.addEventListener('dataavailable', (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data)
              }
            })
            
            mediaRecorder.addEventListener('stop', async () => {
              if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
                await sendAudioChunk(audioBlob)
                audioChunks.length = 0
              }
            })
            
            mediaRecorder.start()
          }
        }, 100)
      }
    }, 5000) // Process every 5 seconds
  } catch (error) {
    console.error('Error setting up audio recording:', error)
  }
})

// Send audio chunk to the server
const sendAudioChunk = async (audioBlob: Blob) => {
  try {
    const formData = new FormData()
    formData.append('audio', audioBlob)
    formData.append('tabId', tabId)
    
    const response = await $fetch<{ success: boolean; transcription: string }>('/api/audio', {
      method: 'POST',
      body: formData,
    })
    
    if (response.success && response.transcription) {
      // Limit transcription to last ~50 words
      const words = (transcription.value + ' ' + response.transcription).split(' ');
      if (words.length > 50) {
        transcription.value = words.slice(-50).join(' ');
      } else {
        transcription.value += ' ' + response.transcription;
      }
    }
  } catch (error) {
    console.error('Error sending audio chunk:', error)
  }
}

const stopRecording = () => {
  // Stop recording
  isRecording.value = false
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  
  // Clear the interval
  if (recordingInterval) {
    clearInterval(recordingInterval)
  }
  
  // Close the tab and return to home
  if (tabId) {
    tabsStore.closeTab(tabId)
  }
  navigateTo('/')
}

// Handle cleanup when component is unmounted
onBeforeUnmount(() => {
  isRecording.value = false
  
  // Stop the recording
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  
  // Clear the interval
  if (recordingInterval) {
    clearInterval(recordingInterval)
  }
})
</script>

<style scoped>
.recording-logo {
  transform: scale(1.3);
  animation: appear 0.4s ease-in-out;
}

@keyframes appear {
  from {
    transform: scale(1);
    opacity: 0.7;
  }
  to {
    transform: scale(1.3);
    opacity: 1;
  }
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

.transcription-container {
  max-height: 200px;
  overflow: hidden;
  position: relative;
}

.transcription-text {
  transition: transform 0.5s ease-out;
}

.transcription-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(to bottom, rgba(249, 250, 251, 1), rgba(249, 250, 251, 0));
  pointer-events: none;
  z-index: 1;
}
</style> 