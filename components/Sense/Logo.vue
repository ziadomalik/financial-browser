<template>
    <div class="logo-container" 
         :class="{ 'animate': animation !== false, 'no-hover': disableHover, 'listening-mode': isListening }"
         @click="toggleListening">
        <svg width="250" height="250" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g class="logo-elements">
                <circle class="outer-circle" cx="125" cy="125" r="125" fill="#DE3819" fill-opacity="0.05" />
                <circle class="middle-circle" cx="125" cy="125" r="82.9208" fill="#DE3819" fill-opacity="0.05" />
                <ellipse class="inner-circle" cx="125" cy="123.763" rx="55.6931" ry="54.4554" fill="#DE3819" fill-opacity="0.1" />
                <path
                    d="M126.238 131.601C124.003 131.601 122.104 130.818 120.539 129.254C118.975 127.69 118.193 125.791 118.193 123.556V107.467C118.193 105.232 118.975 103.333 120.539 101.769C122.104 100.204 124.003 99.4224 126.238 99.4224C128.472 99.4224 130.372 100.204 131.936 101.769C133.5 103.333 134.282 105.232 134.282 107.467V123.556C134.282 125.791 133.5 127.69 131.936 129.254C130.372 130.818 128.472 131.601 126.238 131.601ZM123.556 150.371V142.126C118.908 141.5 115.065 139.422 112.026 135.891C108.987 132.36 107.467 128.249 107.467 123.556H112.83C112.83 127.265 114.137 130.427 116.752 133.042C119.366 135.656 122.528 136.964 126.238 136.964C129.947 136.964 133.109 135.656 135.723 133.042C138.338 130.427 139.645 127.265 139.645 123.556H145.008C145.008 128.249 143.489 132.36 140.45 135.891C137.411 139.422 133.567 141.5 128.919 142.126V150.371H123.556Z"
                    fill="#DE3819" />
            </g>
        </svg>
        
        <div v-if="isListening && transcription" class="transcription-container">
            <div class="transcription-text">
                <template v-for="(word, index) in displayWords" :key="index">
                    <span :class="{'word-enter': word.isNew, 'word-exit': word.isExiting}">
                        {{ word.text }}
                    </span>
                    <span class="word-space"> </span>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ 
    animation?: boolean, 
    disableHover?: boolean,
    isListening?: boolean 
}>()

const emit = defineEmits(['update:isListening', 'queryChipsUpdate'])

const transcription = ref('')
const displayWords = ref<{text: string, isNew: boolean, isExiting: boolean, isLastInSentence: boolean}[]>([])
const maxWords = 6
const audioChunks: Blob[] = []
let mediaRecorder: MediaRecorder | null = null
let recordingInterval: NodeJS.Timeout | null = null
const isRecording = ref(false)

// Toggle the listening state
const toggleListening = () => {
    if (!props.isListening) {
        startRecording()
        emit('update:isListening', true)
    } else {
        stopRecording()
        emit('update:isListening', false)
    }
}

// Start recording function
const startRecording = async () => {
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
        isRecording.value = true
        
        // Set up interval to periodically stop, process, and restart recording
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
        emit('update:isListening', false)
    }
}

// Stop recording function
const stopRecording = () => {
    isRecording.value = false
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
    }
    
    // Clear the interval
    if (recordingInterval) {
        clearInterval(recordingInterval)
    }
    
    // Clear transcription
    transcription.value = ''
    displayWords.value = []
}

// Send audio chunk to the server
const sendAudioChunk = async (audioBlob: Blob) => {
    try {
        const formData = new FormData()
        formData.append('audio', audioBlob)
        
        const response = await $fetch<{ 
            success: boolean; 
            transcription: string;
            queryChips?: Array<{text: string, type: string}>;
        }>('/api/audio', {
            method: 'POST',
            body: formData,
        })
        
        if (response.success && response.transcription) {
            // Process transcription text
            let processedText = response.transcription
            
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
            
            // Update the transcription value
            transcription.value = processedText
            
            // Create a more clean way to split the words
            const words = processedText.split(' ').filter(w => w.trim())
            
            const newWords = words.map((word) => ({
                text: word,
                isNew: true, 
                isExiting: false,
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
            
            // Emit query chips to parent component if they exist
            if (response.queryChips && response.queryChips.length > 0) {
                emit('queryChipsUpdate', response.queryChips)
            }
        }
    } catch (error) {
        console.error('Error sending audio chunk:', error)
    }
}

// Clean up when component is unmounted
onBeforeUnmount(() => {
    stopRecording()
})

// Watch for changes in the isListening prop
watch(() => props.isListening, (newVal) => {
    if (newVal && !isRecording.value) {
        startRecording()
    } else if (!newVal && isRecording.value) {
        stopRecording()
    }
}, { immediate: true })
</script>

<style scoped>
.logo-container {
    position: relative;
    display: inline-block;
    cursor: pointer;
    padding: 30px;
    overflow: visible;
    transition: transform 0.3s ease;
}

.logo-container.animate .outer-circle {
    animation: pulse-outer 5s ease-in-out infinite;
}

.logo-container.animate .middle-circle {
    animation: pulse-middle 4s ease-in-out infinite;
}

.logo-container.animate .inner-circle {
    animation: pulse-inner 3s ease-in-out infinite;
}

.logo-container:hover {
    transform: scale(1.1);
}

.logo-container:hover .outer-circle {
    animation: pulse-outer-hover 5s ease-in-out infinite;
    animation-delay: 0s;
}

.logo-container:hover .middle-circle {
    animation: pulse-middle-hover 4s ease-in-out infinite;
    animation-delay: 0s;
}

.logo-container:hover .inner-circle {
    animation: pulse-inner-hover 3s ease-in-out infinite;
    animation-delay: 0s;
}

.logo-container.no-hover:hover {
    transform: none;
}

.logo-container.no-hover:hover .outer-circle,
.logo-container.no-hover:hover .middle-circle,
.logo-container.no-hover:hover .inner-circle {
    animation: none;
}

/* Listening mode styles - more vibrant/aggressive animations */
.logo-container.listening-mode {
    transform: scale(1.2);
}

.logo-container.listening-mode .outer-circle {
    animation: pulse-listening-outer 2s ease-in-out infinite;
    fill: #DE3819;
    fill-opacity: 0.15;
}

.logo-container.listening-mode .middle-circle {
    animation: pulse-listening-middle 1.5s ease-in-out infinite;
    fill: #DE3819;
    fill-opacity: 0.2;
}

.logo-container.listening-mode .inner-circle {
    animation: pulse-listening-inner 1s ease-in-out infinite;
    fill: #DE3819;
    fill-opacity: 0.25;
}

.logo-container.listening-mode path {
    animation: pulse-microphone 1s ease-in-out infinite;
}

@keyframes pulse-outer {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
}

@keyframes pulse-middle {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes pulse-inner {
    0%, 100% { transform: scale(1.02); }
    50% { transform: scale(0.98); }
}

@keyframes pulse-outer-hover {
    0%, 100% { transform: scale(1.03); }
    50% { transform: scale(1.08); }
}

@keyframes pulse-middle-hover {
    0%, 100% { transform: scale(1.05); }
    50% { transform: scale(1.12); }
}

@keyframes pulse-inner-hover {
    0%, 100% { transform: scale(1.08); }
    50% { transform: scale(0.95); }
}

/* Listening mode animations - more vibrant */
@keyframes pulse-listening-outer {
    0%, 100% { transform: scale(1.05); }
    50% { transform: scale(1.15); }
}

@keyframes pulse-listening-middle {
    0%, 100% { transform: scale(1.08); }
    50% { transform: scale(1.2); }
}

@keyframes pulse-listening-inner {
    0%, 100% { transform: scale(1.1); }
    50% { transform: scale(0.9); }
}

@keyframes pulse-microphone {
    0%, 100% { fill: #DE3819; }
    50% { fill: #ff4c2e; }
}

circle, ellipse, path {
    transform-origin: center;
}

.logo-elements {
    transform-origin: center;
    transition: transform 0.3s ease;
    transform-box: fill-box;
}

svg {
    overflow: visible;
}

/* Transcription styles */
.transcription-container {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    max-width: 300px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 10px;
    padding: 10px;
    margin-top: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.transcription-text {
    font-size: 14px;
    color: #333;
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

.word-space {
    display: inline-block;
    width: 0.3em;
}
</style>
