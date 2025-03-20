<template>
  <div class="query-results">
    <div v-if="results.length > 0" class="results-container">
      <h3 class="text-lg font-semibold mb-2">Real-time Query Results</h3>
      <div v-for="(result, index) in results" :key="index" class="result-item">
        <div class="result-event">
          <strong>User action:</strong> {{ result.event }}
        </div>
        <div class="result-content">
          <div v-if="result.toolResults?.length > 0">
            <div v-for="(toolResult, i) in result.toolResults" :key="i">
              <div class="tool-result">
                <div class="tool-name">{{ toolResult.name }}</div>
                <div class="tool-data">
                  <pre>{{ JSON.stringify(toolResult.data, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="p-2">
            {{ result.result }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-results">
      <p>No query results yet. Interact with the application to see results.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { $queryResults } = useNuxtApp() as any
const results = computed(() => $queryResults?.value || [])
</script>

<style scoped>
.query-results {
  @apply bg-white rounded-lg shadow-md p-4 max-h-96 overflow-y-auto;
}

.result-item {
  @apply border-b border-gray-200 pb-3 mb-3;
}

.result-item:last-child {
  @apply border-b-0 pb-0 mb-0;
}

.result-event {
  @apply text-sm text-gray-700 mb-2;
}

.result-content {
  @apply bg-gray-50 rounded p-2;
}

.tool-result {
  @apply mb-2;
}

.tool-name {
  @apply text-sm font-medium text-blue-600;
}

.tool-data {
  @apply bg-gray-100 rounded p-2 mt-1 overflow-x-auto;
}

.tool-data pre {
  @apply text-xs;
}

.no-results {
  @apply text-center text-gray-500 p-4;
}
</style> 