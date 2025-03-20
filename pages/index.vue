<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
          <path d="M13 5v2"></path>
          <path d="M13 17v2"></path>
          <path d="M13 11v2"></path>
        </svg>
        <h1 class="text-xl font-bold">Financial Browser</h1>
      </div>
      <div class="flex items-center space-x-4">
        <button @click="logout" class="text-sm text-gray-600 hover:text-gray-900">Logout</button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Content Area -->
      <main class="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div class="max-w-6xl mx-auto space-y-8">
          <QueryInput @submit="handleQuerySubmit" :loading="isLoading" />
          
          <!-- Results Container -->
          <div v-if="stockData" class="space-y-6">
            <StockOverviewCard :stock-data="stockData" />
            
            <div class="grid md:grid-cols-2 gap-6">
              <PriceHistoryChart :stock-data="stockData" />
              
              <!-- Performance Metrics -->
              <div class="grid grid-cols-2 gap-4">
                <PerformanceMetricCard 
                  title="Return" 
                  :value="stockData.return"
                  icon="trending-up"
                  :positive="parseFloat(stockData.return) > 0"
                  format="percent"
                />
                <PerformanceMetricCard 
                  title="Maximum Price" 
                  :value="stockData.maxPrice"
                  icon="arrow-up-right"
                  :positive="true"
                  format="price"
                />
                <PerformanceMetricCard 
                  title="Minimum Price" 
                  :value="stockData.minPrice"
                  icon="arrow-down-right"
                  :positive="false"
                  format="price"
                />
                <PerformanceMetricCard 
                  title="Volatility" 
                  :value="volatility"
                  icon="activity"
                  :positive="false"
                  format="percent"
                />
              </div>
            </div>
          </div>
          
          <div v-else-if="!isLoading" class="bg-white rounded-lg shadow p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-gray-400">
              <path d="M17 6.1H3"></path>
              <path d="M21 12.1H3"></path>
              <path d="M15.1 18H3"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
            <p class="text-gray-500">Enter a financial query above to see data visualizations and insights.</p>
          </div>
          
          <div v-else class="bg-white rounded-lg shadow p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Processing your query...</h3>
            <p class="text-gray-500">This may take a moment while we gather financial data.</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'
import { useFinancialApi } from '~/composables/useFinancialApi'

// Define the StockData interface
interface StockData {
  symbol: string;
  name: string;
  firstPrice: number;
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  return: string;
  priceData?: any[];
}

const router = useRouter()
const supabase = useSupabaseClient()

const { isLoading, error, queryFinancialData } = useFinancialApi()
const stockData = ref<StockData | null>(null)
const queryHistory = ref<string[]>([])

// Computed property for volatility (example calculation)
const volatility = computed(() => {
  if (!stockData.value) return "0%"
  
  // Simple volatility calculation: (max - min) / avg * 100
  const max = stockData.value.maxPrice
  const min = stockData.value.minPrice
  const avg = (max + min) / 2
  const volatilityValue = ((max - min) / avg) * 100
  
  return volatilityValue.toFixed(2) + "%"
})

const handleQuerySubmit = async (query: string) => {
  try {
    // Add to query history
    queryHistory.value.unshift(query)
    
    // Call the API service
    const result = await queryFinancialData(query)
    
    if (result) {
      stockData.value = result
    } else if (error.value) {
      // Handle error
      console.error("API Error:", error.value)
    }
  } catch (err) {
    console.error("Error processing query:", err)
  }
}

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error logging out:', error.message)
  router.push('/auth')
}
</script>