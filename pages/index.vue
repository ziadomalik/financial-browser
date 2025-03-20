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
          <!-- API Connectivity Alert -->
          <div v-if="apiAvailable === false" class="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-amber-800">API Currently Unavailable</h3>
                <div class="mt-2 text-sm text-amber-700">
                  <p>The financial data service is not available at this time. All visualizations will use simulated data.</p>
                  <div class="mt-3">
                    <button
                      class="inline-flex items-center px-3 py-1.5 border border-amber-400 text-xs font-medium rounded-md text-amber-800 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                      @click="retryApiConnectivity">
                      <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
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
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              {{ apiAvailable === false ? 'API Unavailable' : 'No results yet' }}
            </h3>
            <p class="text-gray-500">
              {{ apiAvailable === false ? 
                 'The financial data service is currently unavailable. Enter a query to see simulated data.' : 
                 'Enter a financial query above to see data visualizations and insights.' }}
            </p>
            <div v-if="apiAvailable === false" class="mt-4">
              <button 
                @click="handleQuerySubmit('Tesla stock')" 
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                View Tesla Stock Example
              </button>
            </div>
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
import { ref, computed, onMounted } from 'vue'
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
  isMockData?: boolean;
}

// Define interfaces for API response
interface ApiMessage {
  type: string;
  tool_call_id?: string;
  content?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    args: any;
  }>;
}

interface ApiResponse {
  messages: ApiMessage[];
  objects?: any[];
  [key: string]: any;
}

const router = useRouter()
const supabase = useSupabaseClient()
const config = useRuntimeConfig()

const { isLoading, error, isMockData, queryFinancialData, checkApiConnectivity: apiCheck, setApiAvailable } = useFinancialApi()
const stockData = ref<StockData | null>(null)
const queryHistory = ref<string[]>([])
const apiAvailable = ref<boolean | null>(null)
const lastQuery = ref('')

// Function to force update the apiAvailable state
const updateApiState = (isAvailable: boolean) => {
  console.log(`Updating API state to: ${isAvailable}`)
  apiAvailable.value = isAvailable
  setApiAvailable(isAvailable)
}

// Initialize and check API connectivity when component mounts
onMounted(async () => {
  console.log('Component mounted, checking API connectivity')
  const isAvailable = await checkApiConnectivity()
  
  console.log('API connectivity check result:', isAvailable)
  
  // Update both the UI state and the API service state
  updateApiState(isAvailable)
  
  // If API is available, make a default query to show data
  if (isAvailable) {
    console.log('API is available, loading default data')
    handleQuerySubmit('Tesla stock')
  } else {
    console.log('API is not available, will use mock data')
  }
})

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

// Function to check if the API is available
const checkApiConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Checking API connectivity from index page')
    return await apiCheck()
  } catch (e) {
    console.warn('API connectivity check from index page failed:', e)
    return false
  }
}

// Function to retry API connectivity
const retryApiConnectivity = async () => {
  console.log('Retrying API connectivity...')
  apiAvailable.value = null // Set to loading state
  
  const isAvailable = await checkApiConnectivity()
  console.log(`API connectivity check returned: ${isAvailable}`)
  
  // Update both the UI state and the API service state
  updateApiState(isAvailable)
  
  if (isAvailable) {
    console.log('API connection restored, loading default data')
    handleQuerySubmit('Tesla stock')
  } else {
    console.log('API connection still unavailable, will use simulated data')
  }
}

const handleQuerySubmit = async (query: string) => {
  try {
    lastQuery.value = query
    console.log('Submitting query:', query)
    
    // Add to query history
    queryHistory.value.unshift(query)
    
    // Call the API service
    const result = await queryFinancialData(query)
    
    if (result) {
      console.log('Query result received, result object:', JSON.stringify({
        symbol: result.symbol,
        isMockData: result.isMockData
      }))
      console.log('isMockData reactive ref value:', isMockData.value)
      
      // Store the result in our data ref
      stockData.value = result
      
      // Check if the result has a valid isMockData property
      const isUsingMockData = result.isMockData === true || isMockData.value === true
      
      // Set API availability based on whether mock data was used
      updateApiState(!isUsingMockData)
      
      if (isUsingMockData) {
        console.log('Using mock data, API unavailable')
      } else {
        console.log('Using real API data, API available')
      }
    } else if (error.value) {
      // Handle error
      console.error("API Error:", error.value)
      updateApiState(false)
    }
  } catch (err) {
    console.error("Error processing query:", err)
    updateApiState(false)
  }
}

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error logging out:', error.message)
  router.push('/auth')
}
</script>