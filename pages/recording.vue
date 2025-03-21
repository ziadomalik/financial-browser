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
        <p class="transcription-text">
          <template v-for="(word, index) in displayWords" :key="index">
            <span :class="{'word-enter': word.isNew, 'word-exit': word.isExiting}">
              {{ word.text }}
            </span>
            <span class="word-space"> </span>
          </template>
        </p>
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
const displayWords = ref<{text: string, isNew: boolean, isExiting: boolean, isLastInSentence: boolean}[]>([])
const maxWords = 30 // Reduced from 50 to make buffer shorter
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
      console.log('Raw API response text:', JSON.stringify(response.transcription))
      
      // EXTREMELY AGGRESSIVE text processing
      let processedText = response.transcription
      
      // Add a character-level inspection to see what might be happening
      console.log('Character codes:', [...processedText].map(c => `${c}:${c.charCodeAt(0)}`))
      
      // Handle potential unicode space issues or zero-width spaces
      processedText = processedText.replace(/[\u200B-\u200D\uFEFF]/g, ' ')
      
      // Force space between any letter/number and another letter/number of different case
      processedText = processedText.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
      processedText = processedText.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      processedText = processedText.replace(/([0-9])([A-Za-z])/g, '$1 $2')
      processedText = processedText.replace(/([A-Za-z])([0-9])/g, '$1 $2')
      
      // Add spaces around punctuation
      processedText = processedText.replace(/([.,!?;:,])/g, '$1 ')
      
      // Break up obvious CamelCase and PascalCase patterns
      processedText = processedText
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      
      // Normalize multiple spaces to single space
      processedText = processedText.replace(/\s+/g, ' ').trim()
      
      console.log('Processed text:', processedText)
      
      // Update the transcription value to ensure v-if works
      transcription.value = processedText
      
      // Create a more clean way to split the words
      const words = processedText.split(' ').filter(w => w.trim())
      
      const newWords = words.map((word, idx) => ({
        text: word,
        isNew: true, 
        isExiting: false,
        // Only mark a word as last in sentence if it ends with sentence-ending punctuation
        // but still add spaces between words regardless
        isLastInSentence: false
      }))
      
      displayWords.value = [...displayWords.value, ...newWords]
      
      // After a short delay, remove the "new" status
      setTimeout(() => {
        displayWords.value = displayWords.value.map(word => ({
          ...word,
          isNew: false
        }))
      }, 500)
      
      // If we have too many words, mark oldest ones for exit animation
      if (displayWords.value.length > maxWords) {
        const excessCount = displayWords.value.length - maxWords
        
        // Mark words that will be removed as exiting
        displayWords.value = displayWords.value.map((word, index) => ({
          ...word,
          isExiting: index < excessCount
        }))
        
        // After animation completes, remove the exiting words
        setTimeout(() => {
          displayWords.value = displayWords.value.slice(excessCount)
        }, 500) // Match this to the CSS transition duration
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

.transcription-text span {
  display: inline-block;
  transition: all 0.5s ease;
}

.word-enter {
  opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.4s forwards;
}

.word-exit {
  opacity: 1;
  transform: translateY(0);
  animation: fadeOut 0.4s forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
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

/* Ensure spaces are visible */
.word-space {
  display: inline-block;
  width: 0.3em;
}
</style> 