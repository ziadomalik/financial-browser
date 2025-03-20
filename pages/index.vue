<template>
  <div>
    <NuxtLayout name="default">
      <div class="py-8">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Financial Browser</h1>
              <p class="text-gray-600">Search for stocks and financial information</p>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center">
                <div class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" 
                  :class="apiAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  <span class="mr-1 w-2 h-2 rounded-full" 
                    :class="apiAvailable ? 'bg-green-600 animate-pulse' : 'bg-red-600'"></span>
                  <span>API {{ apiAvailable ? 'Available' : 'Unavailable' }}</span>
                </div>
              </div>
              <button @click="logout" class="text-sm text-gray-600 hover:text-gray-900">
                Logout
              </button>
            </div>
          </div>
          
          <QueryInput @submit="handleQuerySubmit" :loading="isLoading" />
          
          <!-- Error Message Display -->
          <div v-if="errorMessage" class="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span class="font-semibold">Error:</span>
              <span class="ml-2">{{ errorMessage }}</span>
            </div>
            <div class="mt-3 ml-8 text-sm">
              <p>The financial data service is currently unavailable or experiencing issues. Please try:</p>
              <ul class="mt-2 list-disc ml-5">
                <li>Using a more specific query (e.g., "AAPL stock price" instead of "Apple")</li>
                <li>Waiting a few minutes and trying again</li>
                <li>Checking your internet connection</li>
              </ul>
            </div>
          </div>
          
          <!-- Loading Animation -->
          <div v-if="isLoading" class="py-12">
            <div class="loading-container mx-auto">
              <div class="chart-loading">
                <div class="chart-line"></div>
                <div class="chart-tooltip">
                  <div class="tooltip-content">
                    <div class="tooltip-price">$</div>
                    <div class="tooltip-date">Loading...</div>
                  </div>
                </div>
                <div class="data-points">
                  <div class="data-point p1"></div>
                  <div class="data-point p2"></div>
                  <div class="data-point p3"></div>
                  <div class="data-point p4"></div>
                  <div class="data-point p5"></div>
                  <div class="data-point p6"></div>
                </div>
                <div class="x-axis"></div>
              </div>
              <div class="loading-text">Fetching Financial Data...</div>
            </div>
          </div>
          
          <!-- Results Container - Now shows results from newest to oldest -->
          <div class="space-y-10">
            <!-- New results get stacked on top -->
            <div v-for="(result, index) in queryResults" :key="index" class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <!-- Query header -->
              <div class="p-4 bg-gray-50 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">{{ result.query }}</h3>
                <div class="flex flex-wrap gap-2 mt-2">
                  <span 
                    v-for="tool in result.tools" 
                    :key="tool" 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {{ formatToolName(tool) }}
                  </span>
                </div>
              </div>
              
              <!-- Result content -->
              <div class="p-4 space-y-6">
                <!-- Stock overview card if stock data is available -->
                <StockOverviewCard v-if="result.stockData" :stock-data="result.stockData" />
                
                <div class="space-y-6">
                  <!-- Stock Price History - Prioritize displaying chart when historical data is present -->
                  <div v-if="result.hasStockPriceData || hasHistoricalPriceTools(result.tools)" class="space-y-4">
                    <!-- Title section to clarify the data type -->
                    <div v-if="hasHistoricalPriceTools(result.tools)" class="flex items-center justify-between">
                      <h3 class="text-lg font-medium text-gray-900">Historical Price Data</h3>
                      <span class="text-sm text-gray-500">{{ result.stockData.priceData?.length || 0 }} data points</span>
                    </div>
                    
                    <!-- Show the full-width chart when we have historical price data -->
                    <div v-if="hasHistoricalPriceTools(result.tools)" class="w-full">
                      <PriceHistoryChart :stock-data="result.stockData" />
                    </div>
                    
                    <!-- Show grid layout with chart and metrics when we have regular stock data -->
                    <div v-else class="grid md:grid-cols-2 gap-6">
                      <PriceHistoryChart :stock-data="result.stockData" />
                      
                      <!-- Performance Metrics -->
                      <div v-if="result.stockData" class="grid grid-cols-2 gap-4">
                        <PerformanceMetricCard 
                          title="Return" 
                          :value="result.stockData.return"
                          icon="trending-up"
                          :positive="parseFloat(result.stockData.return) > 0"
                          format="percent"
                        />
                        <PerformanceMetricCard 
                          title="Maximum Price" 
                          :value="result.stockData.maxPrice"
                          icon="arrow-up-right"
                          :positive="true"
                          format="price"
                        />
                        <PerformanceMetricCard 
                          title="Minimum Price" 
                          :value="result.stockData.minPrice"
                          icon="arrow-down-right"
                          :positive="false"
                          format="price"
                        />
                        <PerformanceMetricCard 
                          title="Volatility" 
                          :value="calculateVolatility(result.stockData)"
                          icon="activity"
                          :positive="false"
                          format="percent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <!-- Company Information -->
                  <div v-if="result.hasCompanyData || result.tools.includes('companydatasearch')" class="mt-6">
                    <CompanyDataCard :company-data="result.companyData" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Simple empty state when there are no results and we're not loading -->
          <div v-if="queryResults.length === 0 && !isLoading" class="mt-8 p-6 bg-white rounded-lg shadow-sm text-center">
            <p class="text-gray-500">
              Enter a financial query above to see stock data and insights
            </p>
          </div>
          
          <!-- Previous Searches Section -->
          <div v-if="queryHistory.length > 0" class="mt-12 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Previous Searches</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(query, index) in queryHistory"
                :key="index"
                @click="handleQuerySubmit(query)"
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {{ query }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { useRouter } from 'vue-router'
import { useFinancialApi } from '~/composables/useFinancialApi'

// Define interfaces for StockData 
interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockData {
  symbol: string;
  name: string;
  firstPrice: number;
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  return: string;
  priceData?: PriceDataPoint[];
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

// Define a new interface for query results
interface QueryResult {
  query: string;
  stockData: StockData;
  companyData: any;
  tools: string[];
  hasStockPriceData: boolean;
  hasCompanyData: boolean;
  timestamp: number;
}

const router = useRouter()
const supabase = useSupabaseClient()
const config = useRuntimeConfig()

const { 
  isLoading, 
  error, 
  isMockData, 
  queryFinancialData, 
  checkApiConnectivity: apiCheck, 
  setApiAvailable,
  stockPriceData,
  companyInfoData,
  availableTools
} = useFinancialApi()

// Store for current query data
const stockData = ref<StockData | null>(null)

// Store for query history and results
const queryHistory = ref<string[]>([])
const queryResults = ref<QueryResult[]>([])

const apiAvailable = ref<boolean | null>(null)
const lastQuery = ref('')

// Add error message state
const errorMessage = ref('')

// Initialize and check API connectivity when component mounts
onMounted(async () => {
  console.log('Component mounted, checking API connectivity')
  const isAvailable = await checkApiConnectivity()
  
  console.log('API connectivity check result:', isAvailable)
  
  // Update both the UI state and the API service state
  updateApiState(isAvailable)
  
  console.log('API availability set, waiting for user query')
  
  // Load previous queries from local storage if available
  loadPreviousQueries()
})

// Function to calculate volatility for a stock
const calculateVolatility = (stock: StockData): string => {
  if (!stock) return "0%"
  
  // Simple volatility calculation: (max - min) / avg * 100
  const max = stock.maxPrice
  const min = stock.minPrice
  const avg = (max + min) / 2
  const volatilityValue = ((max - min) / avg) * 100
  
  return volatilityValue.toFixed(2) + "%"
}

// Function to force update the apiAvailable state
const updateApiState = (isAvailable: boolean) => {
  console.log(`Updating API state to: ${isAvailable}`)
  apiAvailable.value = isAvailable
  setApiAvailable(isAvailable)
}

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

// Format tool names for display
const formatToolName = (toolName: string): string => {
  switch (toolName) {
    case 'ohlcv':
      return 'Price History';
    case 'companydatasearch':
      return 'Company Data';
    case 'query':
      return 'Stock Overview';
    case 'searchwithcriteria':
      return 'Search';
    case 'summary':
      return 'Summary';
    default:
      // Capitalize first letter and replace underscores with spaces
      return toolName
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  }
}

// Load queries from localStorage if available
const loadPreviousQueries = () => {
  try {
    // Load query history
    const savedHistory = localStorage.getItem('queryHistory')
    if (savedHistory) {
      queryHistory.value = JSON.parse(savedHistory)
    }
    
    // Load query results
    const savedResults = localStorage.getItem('queryResults')
    if (savedResults) {
      queryResults.value = JSON.parse(savedResults)
    }
    
    console.log(`Loaded ${queryHistory.value.length} previous queries and ${queryResults.value.length} results`)
  } catch (e) {
    console.warn('Error loading previous queries:', e)
  }
}

// Save queries to localStorage
const saveQueries = () => {
  try {
    // Save only the most recent 10 queries and results to avoid localStorage limits
    const historyToSave = queryHistory.value.slice(0, 10)
    const resultsToSave = queryResults.value.slice(0, 10)
    
    localStorage.setItem('queryHistory', JSON.stringify(historyToSave))
    localStorage.setItem('queryResults', JSON.stringify(resultsToSave))
  } catch (e) {
    console.warn('Error saving queries:', e)
  }
}

const handleQuerySubmit = async (query: string) => {
  try {
    // Clear any previous error
    errorMessage.value = ''
    lastQuery.value = query
    console.log('Submitting query:', query)
    
    // Add to query history (if not already at the top)
    if (queryHistory.value[0] !== query) {
      // Remove the query if it exists elsewhere in the history
      queryHistory.value = queryHistory.value.filter(q => q !== query)
      // Add to the beginning
      queryHistory.value.unshift(query)
    }
    
    // Always call the API for fresh data, even if this query has been made before
    try {
      console.log('Making fresh API call for query:', query)
      const result = await queryFinancialData(query)
      
      if (result) {
        console.log('Query result received, result object:', JSON.stringify({
          symbol: result.symbol
        }))
        console.log('Available tools:', availableTools.value.join(', '))
        
        // Store the result in our data ref
        stockData.value = result
        
        // Set API availability (always true if we got a result)
        updateApiState(true)
        
        // Create a new query result object
        const newResult: QueryResult = {
          query: query,
          stockData: result,
          companyData: companyInfoData.value || {},
          tools: [...availableTools.value], // Create a copy of the array
          hasStockPriceData: stockPriceData.value !== null,
          hasCompanyData: companyInfoData.value !== null && Object.keys(companyInfoData.value).length > 0,
          timestamp: Date.now()
        }
        
        // Always add the new result at the beginning, even if query is repeated
        queryResults.value.unshift(newResult)
        
        // Save to localStorage
        saveQueries()
        
        console.log('Using API data')
      }
    } catch (apiError: any) {
      // Enhanced API-specific error handling with more detailed messages
      console.error("API Error:", apiError)
      
      // Extract the most user-friendly message possible
      let userMessage = 'Failed to get data from the API'
      
      // If it's a structured API error response with a detailed message
      if (apiError.response && apiError.response.message) {
        userMessage = apiError.response.message
      } else if (apiError.message) {
        // For standard errors, get the message
        userMessage = apiError.message
        
        // Clean up common API error messages to be more user-friendly
        if (userMessage.includes('422 Unprocessable Entity')) {
          userMessage = 'The financial data service is currently unable to process this request.'
        } else if (userMessage.includes('timeout')) {
          userMessage = 'The request timed out. The financial service may be under high load or temporarily unavailable.'
        } else if (userMessage.includes('NetworkError')) {
          userMessage = 'Network error occurred. Please check your internet connection.'
        }
      }
      
      error.value = userMessage
      errorMessage.value = userMessage
      updateApiState(false)
    }
  } catch (err) {
    // Handle any other errors in the outer function
    console.error("Error processing query:", err)
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    errorMessage.value = `${error.value}`
    updateApiState(false)
  }
}

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error logging out:', error.message)
  router.push('/auth')
}

// Helper function to check if a query has historical price data tools
const hasHistoricalPriceTools = (tools: string[]): boolean => {
  const historicalPriceTools = ['ohlcv', 'Historical_Price_Data']
  return tools.some(tool => historicalPriceTools.includes(tool))
}
</script>

<style>
/* Chart Loading Animation */
.loading-container {
  width: 280px;
  height: 220px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chart-loading {
  position: relative;
  width: 280px;
  height: 140px;
  margin-bottom: 20px;
}

.chart-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  overflow: hidden;
}

.chart-line::before {
  content: "";
  position: absolute;
  top: 40px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, rgba(66, 153, 225, 0.5) 0%, rgba(66, 153, 225, 1) 50%, rgba(66, 153, 225, 0.5) 100%);
  animation: chartLine 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.x-axis {
  position: absolute;
  bottom: 30px;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #e2e8f0;
}

.chart-tooltip {
  position: absolute;
  top: 10px;
  left: 40%;
  transform: translateX(-50%);
  background-color: #2b6cb0;
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  animation: tooltipPulse 2s ease-in-out infinite;
}

.chart-tooltip::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #2b6cb0;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tooltip-price {
  font-weight: bold;
  font-size: 14px;
}

.tooltip-date {
  font-size: 10px;
  opacity: 0.8;
}

.data-points {
  position: absolute;
  bottom: 30px;
  left: 0;
  width: 100%;
  height: 80px;
}

.data-point {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #4299e1;
  transform: translate(-50%, -50%);
}

.p1 {
  left: 0%;
  bottom: 30%;
  animation: dataPointPulse 2s 0.1s infinite;
}

.p2 {
  left: 20%;
  bottom: 60%;
  animation: dataPointPulse 2s 0.3s infinite;
}

.p3 {
  left: 40%;
  bottom: 40%;
  animation: dataPointPulse 2s 0.5s infinite;
}

.p4 {
  left: 60%;
  bottom: 70%;
  animation: dataPointPulse 2s 0.7s infinite;
}

.p5 {
  left: 80%;
  bottom: 50%;
  animation: dataPointPulse 2s 0.9s infinite;
}

.p6 {
  left: 100%;
  bottom: 65%;
  animation: dataPointPulse 2s 1.1s infinite;
}

.loading-text {
  color: #4a5568;
  font-size: 16px;
  font-weight: 500;
  margin-top: 10px;
  position: relative;
}

.loading-text::after {
  content: "...";
  position: absolute;
  width: 24px;
  text-align: left;
  animation: loadingDots 1.5s infinite steps(4, end);
}

@keyframes chartLine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes dataPointPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 1;
  }
}

@keyframes tooltipPulse {
  0%, 100% {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) translateY(0px);
  }
}

@keyframes loadingDots {
  0% { content: ""; }
  25% { content: "."; }
  50% { content: ".."; }
  75% { content: "..."; }
}
</style>