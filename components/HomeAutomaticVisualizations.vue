<template>
  <div class="automatic-visualizations">
    <h3 class="text-xl font-semibold mb-4">Automatic Insights</h3>
    
    <div v-if="isLoading && visualizations.length === 0" class="flex justify-center py-6">
      <div class="animate-pulse text-gray-400">Loading insights...</div>
    </div>
    
    <div v-else-if="visualizations.length === 0" class="text-center py-6 text-gray-500">
      <p>Interact with the application to generate automatic insights</p>
    </div>
    
    <div v-else class="space-y-4">
      <div v-for="(viz, index) in visualizations" :key="index" class="visualization-item">
        <div class="text-sm text-gray-500 mb-1">
          {{ new Date(viz.timestamp).toLocaleString() }} • {{ viz.query }}
        </div>
        
        <div v-for="(card, cardIndex) in viz.adaptiveCards" :key="cardIndex">
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
</script>

<style scoped>
.automatic-visualizations {
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  background-color: #f9fafb;
}

.visualization-item {
  padding: 12px;
  border-radius: 6px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style> 