<template>
  <div class="w-full h-screen flex flex-col bg-[#ECECEC]">
    <!-- Placeholder that always renders the same structure in both server and client -->
    <div class="tabs-area">
      <ClientOnly>
        <ClientSocketProvider v-slot="{ socket, connected }">
          <Tabs />
        </ClientSocketProvider>
        
        <!-- Fallback while client-side JS loads -->
        <template #fallback>
          <div class="p-4 flex items-center">
            <div class="animate-pulse bg-gray-200 h-8 w-24 rounded-md mx-2"></div>
            <div class="animate-pulse bg-gray-200 h-8 w-24 rounded-md mx-2"></div>
          </div>
        </template>
      </ClientOnly>
    </div>
    
    <div class="flex-1 w-full bg-white rounded-t-3xl overflow-hidden">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Import the client-only component
import ClientSocketProvider from '~/components/ClientSocketProvider.client.vue'
</script>

