<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Financial Research Query</h3>
      <p class="text-sm text-gray-500">Ask about stocks, companies, or financial data</p>
    </div>
    
    <div class="p-4">
      <form @submit.prevent="submitQuery" class="space-y-4">
        <div>
          <div class="relative">
            <input
              v-model="query"
              type="text"
              class="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., Get me the data on Tesla stock"
              :disabled="loading"
            />
            <button
              type="submit"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!query.trim() || loading"
            >
              <span v-if="loading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
              <span v-else class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Search
              </span>
            </button>
          </div>
        </div>
        
        <!-- Query Suggestions -->
        <div class="flex flex-wrap gap-2">
          <span class="text-sm text-gray-500">Try:</span>
          <button 
            v-for="(suggestion, index) in suggestions" 
            :key="index"
            type="button"
            @click="useQuerySuggestion(suggestion)"
            class="text-sm px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            {{ suggestion }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const query = ref('')
const suggestions = ref([
  'Get me data on Tesla stock',
  'Show Apple stock performance',
  'Compare Microsoft and Google stocks',
  'Show me Nvidia\'s historical prices'
])

const submitQuery = () => {
  if (query.value.trim()) {
    emit('submit', query.value.trim())
  }
}

const useQuerySuggestion = (suggestion: string) => {
  query.value = suggestion
  submitQuery()
}
</script> 