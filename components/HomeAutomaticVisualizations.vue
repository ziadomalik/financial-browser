<template>
  <div class="automatic-visualizations">
    <div class="header-actions-container">
      <h3 class="text-2xl font-bold mb-0 text-[#DE3819]">Automatic Insights</h3>
      <button v-if="!isLoading" @click="refreshVisualizations" class="refresh-button">
        <span class="loading-spinner" v-if="isRefreshing"></span>
        <span v-else>Refresh</span>
      </button>
      <button v-else @click="forceResetLoading" class="cancel-button">
        Cancel Loading
      </button>
    </div>
    
    <div v-if="isLoading && visualizations.length === 0" class="flex justify-center py-8">
      <div class="animate-pulse text-gray-500 text-lg">Loading insights...</div>
    </div>
    
    <div v-else-if="visualizations.length === 0" class="text-center py-8 text-gray-500">
      <p class="text-lg">Interact with the application to generate automatic insights</p>
    </div>
    
    <div v-else class="space-y-6">
      <div v-for="(viz, index) in visualizations" :key="index" 
           class="visualization-item" 
           :class="{'partial-result': viz.isPartialVisualization}">
        <div class="text-sm text-gray-500 mb-2 flex justify-between">
          <div>{{ new Date(viz.timestamp).toLocaleString() }} • {{ viz.query }}</div>
          <div v-if="viz.isPartialVisualization" class="partial-badge">
            <span class="loading-spinner-small"></span>
            Processing {{ viz.toolName || 'data' }}...
          </div>
        </div>
        
        <div v-if="viz.isPartialVisualization && !viz.adaptiveCards?.length" class="processing-placeholder">
          <div class="text-gray-500">
            <p>Processing query: <strong>{{ viz.query }}</strong></p>
            <p v-if="viz.toolResults && viz.toolResults.length > 0" class="mt-2">
              <span class="tool-badge">{{ viz.toolResults[0].name || 'Tool' }}</span> is currently running...
            </p>
          </div>
        </div>
        
        <div v-for="(card, cardIndex) in parseAdaptiveCards(viz.adaptiveCards)" :key="cardIndex" class="mb-4">
          <AdaptiveCard :card="card" :closable="true" :expandable="!viz.isPartialVisualization" />
        </div>
      </div>
    </div>
    
    <div v-if="error" class="text-red-500 mt-4">
      {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVisualizations } from '~/composables/useVisualizations';
import type { Visualization } from '~/composables/useVisualizations';

// Get current user ID using Nuxt's useUser composable or a default value
const userId = ref<string>('anonymous');

// Try to get the authenticated user
const user = useSupabaseUser();
watchEffect(() => {
  userId.value = user.value?.id || 'anonymous';
});

// State for tracking UI
const isRefreshing = ref(false);
const lastSearchQuery = ref('');

// Use our visualization composable
const { 
  visualizations, 
  isLoading, 
  error,
  refresh,
  setLoading
} = useVisualizations(userId);

// Force reset the loading state
const forceResetLoading = () => {
  setLoading(false);
  isRefreshing.value = false;
  try {
    // Make API call to cancel processing
    $fetch('/api/visualizations/cancel', {
      method: 'POST',
      body: {
        userId: userId.value
      }
    }).catch(err => {
      console.error('Error cancelling jobs:', err);
    });
  } catch (err) {
    console.error('Error cancelling jobs:', err);
  }
};

// Listen for search events from the global event bus
onMounted(() => {
  const nuxtApp = useNuxtApp();
  
  // Access event bus safely with type assertion if needed
  try {
    const eventBus = nuxtApp.$eventBus as any;
    if (eventBus && typeof eventBus.on === 'function') {
      eventBus.on('search:started', (query: string) => {
        lastSearchQuery.value = query;
        console.log('Search started with query:', query);
      });
    }
  } catch (err) {
    console.warn('Event bus not available:', err);
  }
  
  // Listen for socket events to update loading state
  try {
    const socket = nuxtApp.$socket as any;
    if (socket && typeof socket.on === 'function') {
      socket.on('visualization-complete', (data: any) => {
        try {
          const completeData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // If this is a complete response for our current search query, reset loading
          if (completeData.userId === userId.value && completeData.query === lastSearchQuery.value) {
            console.log('Received complete visualization for current search query');
            
            // Immediately reset loading state 
            setLoading(false);
          }
        } catch (err) {
          console.error('Error handling visualization completion in component:', err);
        }
      });
      
      // Also reset loading state on any visualization update
      socket.on('visualization-updates', () => {
        setLoading(false);
      });
      
      // Reset loading on partial updates too
      socket.on('partial-visualization-update', () => {
        // Set a timer to reset loading state after a short period
        // regardless of whether complete results come or not
        setTimeout(() => {
          setLoading(false);
        }, 10000); // 10 second max loading time
      });
    }
  } catch (err) {
    console.warn('Socket not available:', err);
  }
  
  // Safety timeout to ensure loading is never stuck
  setInterval(() => {
    if (isLoading.value) {
      setLoading(false);
    }
  }, 20000); // Reset loading every 20 seconds at most
});

// Function to refresh visualizations
const refreshVisualizations = async () => {
  isRefreshing.value = true;
  
  try {
    await refresh();
  } catch (err) {
    console.error('Error refreshing visualizations:', err);
  } finally {
    isRefreshing.value = false;
  }
};

// Helper function to ensure adaptive cards are properly parsed
const parseAdaptiveCards = (adaptiveCards: any): any[] => {
  if (!adaptiveCards) return [];
  
  try {
    // If it's a string, try to parse it as JSON
    if (typeof adaptiveCards === 'string') {
      return JSON.parse(adaptiveCards);
    }
    
    // If it's already an array, return it
    if (Array.isArray(adaptiveCards)) {
      return adaptiveCards;
    }
    
    // If it's a single object, wrap it in an array
    return [adaptiveCards];
  } catch (err) {
    console.error('Error parsing adaptive cards:', err);
    return [];
  }
};
</script>

<style scoped>
.automatic-visualizations {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background-color: #f9fafb;
  max-height: 70vh;
  overflow-y: auto;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.header-actions-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.refresh-button {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  color: #374151;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-button:hover {
  background-color: #e5e7eb;
}

.cancel-button {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  background-color: #fee2e2;
  border-radius: 0.375rem;
  color: #b91c1c;
  border: 1px solid #fecaca;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background-color: #fecaca;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(156, 163, 175, 0.3);
  border-radius: 50%;
  border-top-color: #6b7280;
  animation: spin 1s ease-in-out infinite;
}

.loading-spinner-small {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid rgba(156, 163, 175, 0.3);
  border-radius: 50%;
  border-top-color: #6b7280;
  animation: spin 1s ease-in-out infinite;
  margin-right: 4px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.visualization-item {
  padding: 16px;
  border-radius: 10px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
}

.partial-result {
  border-left: 4px solid #2563eb;
}

.partial-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  padding: 2px 8px;
  background-color: #dbeafe;
  border-radius: 12px;
  color: #1e40af;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.processing-placeholder {
  padding: 12px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background-color: #f9fafb;
  margin-bottom: 12px;
}

.tool-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f3f4f6;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #4b5563;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style> 