<!-- This component is client-only and provides socket functionality -->
<template>
  <div>
    <slot :socket="socketRef" :connected="isConnected" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { getSocket } from '~/components/socket'
import type { Socket } from 'socket.io-client'

// Socket references with proper typing
const socketRef = ref<Socket | null>(null)
const isConnected = ref(false)

// Only initialize socket on client mount
onMounted(() => {
  // Get the socket instance
  socketRef.value = getSocket()
  
  if (socketRef.value) {
    // Update connection status
    isConnected.value = socketRef.value.connected
    
    // Set up listeners
    socketRef.value.on('connect', () => {
      console.log('Socket connected')
      isConnected.value = true
    })
    
    socketRef.value.on('disconnect', () => {
      console.log('Socket disconnected')
      isConnected.value = false
    })
    
    // Provide socket to components
    provide('socket', socketRef.value)
  }
})
</script> 