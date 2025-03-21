<template>
  <div class="relative w-[450px] mt-4">
      <SInput 
          v-model="searchQuery"
        class="h-[50px] w-full rounded-full pl-12" 
          placeholder="Just type and insights will show" 
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

    <div v-for="card in UiCards" :key="card.id" class="mt-4">
      <AdaptiveCard :card="card" :closable="true" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// API response type
interface PipelineResponse {
  success: boolean;
  message: string;
  jobId?: string;
  error?: boolean;
}

// Visualization data interface
interface VisualizationData {
  userId: string;
  query: string;
  text: string;
  toolResults: any[];
  adaptiveCards: any[];
  timestamp: number;
  isPartial: boolean;
  stepNumber: number;
}

const searchQuery = ref('');
const result = ref<any>('');
const isLoading = ref(false);
const currentJobId = ref<string | null>(null);
const user = useSupabaseUser();
const nuxtApp = useNuxtApp();

// Get socket instance and related state
const { $socket } = useNuxtApp();

const { zodSchema } = await useAdaptiveSchema();

const { object: UiCards, submit } = useObject({
    api: '/api/ui',
    schema: zodSchema.value!
});

// Setup event listeners for visualization updates from socket
onMounted(() => {
  if ($socket) {
    // Listen for partial visualization updates
    $socket.on('partial-visualization-update', handlePartialVisualization);
    
    // Listen for complete visualization updates
    $socket.on('visualization-updates', handleCompleteVisualization);
    
    console.log('[Socket] Event listeners set up');
  }
});

// Clean up event listeners
onUnmounted(() => {
  if ($socket) {
    // Remove socket event listeners
    $socket.off('partial-visualization-update', handlePartialVisualization);
    $socket.off('visualization-updates', handleCompleteVisualization);
    
    console.log('[Socket] Event listeners cleaned up');
  }
});

// Handle partial visualization update (single tool result)
const handlePartialVisualization = async (data: { userId: string, visualizationData: VisualizationData }) => {
  try {
    const visualizationData = data.visualizationData;
    console.log('[Visualization] Received partial visualization:', visualizationData);
    
    // Check if this is for our current query
    if (visualizationData.query !== searchQuery.value) {
      console.log('[Visualization] Ignoring partial result for different query');
      return;
    }
    
    // Show loading indicator
    isLoading.value = true;
    
    // For each step, we render a partial UI card immediately
    if (visualizationData.adaptiveCards && visualizationData.adaptiveCards.length > 0) {
      // Process and add the cards to UI
      await submit({
        userQuery: searchQuery.value,
        toolCallJsonResult: visualizationData.toolResults,
        isPartial: true,
        stepNumber: visualizationData.stepNumber
      });
      
      console.log('[Visualization] Rendered partial UI components for step', visualizationData.stepNumber);
    }
    
    // Keep loading state true until the complete result comes in
  } catch (error) {
    console.error('[Visualization] Error handling partial visualization:', error);
  }
};

// Handle complete visualization update (all tool results)
const handleCompleteVisualization = async (data: { userId: string, visualizationData: VisualizationData }) => {
  try {
    const visualizationData = data.visualizationData;
    console.log('[Visualization] Received complete visualization:', visualizationData);
    
    // Check if this is for our current query
    if (visualizationData.query !== searchQuery.value) {
      console.log('[Visualization] Ignoring complete result for different query');
      return;
    }
    
    // Process the complete set of cards
    if (visualizationData.adaptiveCards && visualizationData.adaptiveCards.length > 0) {
      // Submit the complete result - since it's a new submit, it will replace the previous cards
      await submit({
        userQuery: searchQuery.value,
        toolCallJsonResult: visualizationData.toolResults,
        isPartial: false,
        replaceExisting: true // Signal to replace existing cards
      });
      
      console.log('[Visualization] Rendered complete UI components');
    }
    
    // End loading state
    isLoading.value = false;
    
  } catch (error) {
    console.error('[Visualization] Error handling complete visualization:', error);
    isLoading.value = false;
  }
};

// Add the search query to the data processing pipeline
const addQueryToPipeline = async (query: string) => {
  try {
    // Get the current user ID or use 'anonymous'
    const userId = user.value?.id || 'anonymous';
    
    // Create a click event with the search query
    const payload = {
      userId,
      eventType: 'click',
      eventData: {
        type: 'search',
        query: query,
        source: 'search-bar'
      }
    };
    
    // Add to the pipeline via API endpoint
    const response = await $fetch<PipelineResponse>('/api/pipeline/add-event', {
      method: 'POST',
      body: payload
    });
    
    if (response.success) {
      console.log(`[Pipeline] Search query added to processing pipeline (Job ID: ${response.jobId})`);
      currentJobId.value = response.jobId || null;
      return true;
    } else {
      console.error('[Pipeline] Failed to add query to pipeline:', response.message);
      return false;
    }
  } catch (error) {
    console.error('[Pipeline] Error adding query to pipeline:', error);
    return false;
  }
};

// Handle search event
const handleSearch = async () => {
    if (!searchQuery.value.trim() || isLoading.value) return;
    
    // Set loading state
    isLoading.value = true;
    result.value = '';
    
    console.log('[Search] Starting search process for query:', searchQuery.value);
    
    // Start a new search with empty results
    // We'll use the fresh submit to clear previous results
    await submit({
      userQuery: searchQuery.value,
      toolCallJsonResult: [],
      isNew: true // Signal this is a new search
    });
    
    // Add the query to the data processing pipeline
    const pipelineResult = await addQueryToPipeline(searchQuery.value);
    console.log('[Search] Pipeline result:', pipelineResult ? 'Added to pipeline' : 'Failed to add to pipeline');
    
    // If adding to pipeline failed, end loading state
    if (!pipelineResult) {
      isLoading.value = false;
    }
}
</script>