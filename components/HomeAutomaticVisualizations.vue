<template>
  <div class="automatic-visualizations">
    <h3 class="text-2xl font-bold mb-6 text-[#DE3819]">Automatic Insights</h3>
    
    <div v-if="isLoading && visualizations.length === 0" class="flex justify-center py-8">
      <div class="animate-pulse text-gray-500 text-lg">Loading insights...</div>
    </div>
    
    <div v-else-if="visualizations.length === 0" class="text-center py-8 text-gray-500">
      <p class="text-lg">Interact with the application to generate automatic insights</p>
    </div>
    
    <div v-else class="space-y-6">
      <div v-for="(viz, index) in visualizations" :key="index" class="visualization-item">
        <div class="text-sm text-gray-500 mb-2">
          {{ new Date(viz.timestamp).toLocaleString() }} • {{ viz.query }}
        </div>
        
        <div v-for="(card, cardIndex) in parseAdaptiveCards(viz.adaptiveCards)" :key="cardIndex" class="mb-4">
          <AdaptiveCard :card="card" :closable="true" />
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

// Use our visualization composable
const { 
  visualizations, 
  isLoading, 
  error 
} = useVisualizations(userId);

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

.visualization-item {
  padding: 16px;
  border-radius: 10px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
}
</style> 