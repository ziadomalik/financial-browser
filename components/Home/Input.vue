<template>
  <div class="relative w-[450px] mt-4">
    <SInput 
        v-model="searchQuery"
        class="h-[50px] w-full rounded-full pl-12" 
        placeholder="Search topics using your AI assistant" 
        @keyup.enter="handleSearch"
        :disabled="isLoading"
    />
    <span class="absolute left-0 inset-y-0 flex items-center justify-center px-4">
        <Icon v-if="!isLoading" name="i-ph-magnifying-glass" class="size-5 text-[#DE3819]" />
        <div v-else class="animate-spin size-5 text-[#DE3819]">
            <Icon name="i-ph-spinner" class="size-5" />
        </div>
    </span>
    <button 
        @click="handleSearch" 
        class="absolute right-0 inset-y-0 flex items-center justify-center px-4"
        :disabled="isLoading || !searchQuery.trim()"
    >
        <span 
            class="px-3 py-1 rounded-full bg-[#DE3819] text-white text-sm font-medium" 
            :class="{'opacity-70': isLoading || !searchQuery.trim()}"
        >
            Search
        </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { socket } from '../socket';
import { useUserStore } from '~/stores/user';

const searchQuery = ref('');
const isLoading = ref(false);
const userStore = useUserStore();

// Handle search event
const handleSearch = async () => {
    if (!searchQuery.value.trim() || isLoading.value) return;
    
    // Set loading state
    isLoading.value = true;
    
    try {
        // Emit search event to socket
        socket.emit('user-event', {
            userId: userStore.userId || 'anonymous',
            eventType: 'search',
            eventData: {
                query: searchQuery.value
            }
        });
        
        // Track the search event using the Nuxt app
        const { $trackSearch } = useNuxtApp();
        if ($trackSearch) {
            $trackSearch(searchQuery.value);
        }
        
        // Define type for query result data
        interface QueryResultData {
            event: string;
            result: string;
            toolResults: any[];
        }
        
        // Listen for query results
        const queryResultHandler = (data: QueryResultData) => {
            console.log('Received query result:', data);
            isLoading.value = false;
            
            // Remove this event listener after processing
            socket.off('query-result', queryResultHandler);
        };
        
        // Add the event listener
        socket.on('query-result', queryResultHandler);
        
        // Set a timeout to clear loading state in case response takes too long
        setTimeout(() => {
            isLoading.value = false;
            socket.off('query-result', queryResultHandler);
        }, 15000); // 15 second timeout
        
    } catch (error) {
        console.error('Search error:', error);
        isLoading.value = false;
    }
};

// Set up event listeners
onMounted(() => {
    // Make sure socket is connected and authenticated
    if (!socket.connected) {
        socket.connect();
    }
    
    if (userStore.isAuthenticated && userStore.userId) {
        socket.emit('authenticate', {
            userId: userStore.userId,
            token: userStore.token
        });
    }
});
</script>