<template>
  <div class="voice-input">
    <SButton 
      @click="toggleRecording" 
      :class="[isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600']"
      class="text-white px-4 py-2 rounded flex items-center gap-2"
    >
      <span v-if="isRecording">
        <div class="recording-indicator"></div>
        Stop Recording
      </span>
      <span v-else>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd" />
        </svg>
        Start Voice Search
      </span>
    </SButton>
    
    <div v-if="transcript" class="mt-2">
      <p class="text-sm text-gray-500">You said:</p>
      <p class="font-medium">{{ transcript }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  onResult: {
    type: Function,
    default: null
  }
})

const { $trackVoice } = useNuxtApp() as any

const isRecording = ref(false)
const transcript = ref('')
let recognition: any = null

// Initialize speech recognition if available
const initSpeechRecognition = () => {
  // Check if Speech Recognition API is available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex
      const result = event.results[current]
      const newTranscript = result[0].transcript
      transcript.value = newTranscript
      
      if (result.isFinal) {
        // Track the voice event
        $trackVoice(newTranscript, result[0].confidence)
        
        // Call onResult prop if provided
        if (props.onResult) {
          props.onResult(newTranscript)
        }
        
        // Stop recording after final result
        stopRecording()
      }
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      stopRecording()
    }
    
    return true
  }
  
  console.warn('Speech recognition not supported in this browser')
  return false
}

// Start recording
const startRecording = () => {
  if (!recognition && !initSpeechRecognition()) {
    return
  }
  
  transcript.value = ''
  recognition.start()
  isRecording.value = true
}

// Stop recording
const stopRecording = () => {
  if (recognition) {
    recognition.stop()
    isRecording.value = false
  }
}

// Toggle recording state
const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

// Clean up on component unmount
onUnmounted(() => {
  if (recognition) {
    stopRecording()
  }
})
</script>

<style scoped>
.recording-indicator {
  @apply h-3 w-3 rounded-full bg-red-400 animate-pulse mr-1 inline-block;
}
</style> 