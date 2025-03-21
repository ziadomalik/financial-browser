<template>
  <!-- 
    Dashboard with integrated search functionality
    - Search bar integrated in the header profile section
    - Using the same handleSearch logic from Input.vue for consistency
    - Socket connection for real-time visualization updates
  -->
  <div class="dashboard-container w-full h-full">
    <!-- Header section -->
    <div class="client-profile w-full h-[130px] bg-[#F6F6F6] rounded-[20px]">
      <div class="profile-info mr-6">
        <button class="menu-button">
          <span class="hamburger"></span>
        </button>
        <div class="avatar bg-white flex items-center justify-center">
            <Icon name="i-streamline-interface-setting-menu-2-button-parallel-horizontal-lines-menu-navigation-staggered-three-hamburger" class="size-6 text-[#292929] rounded-full" />
        </div>
        <div class="avatar bg-[#333] flex items-center justify-center overflow-hidden">
            <img src="~/assets/images/Zeno-profile-picture.jpeg" alt="Zeno Hamers" class="w-full h-full object-cover" />
        </div>
        <div class="user-info">
          <h2 class="text-[#3E3E3E] font-semibold">Zeno Hamers</h2>
          <p class="text-[#626262] font-medium">Dashboard</p>
        </div>
      </div>
      
      <!-- Key customer profile characteristics -->
      <div class="profile-characteristics flex-1 flex justify-center gap-3 mx-4 ml-2">
        <div class="characteristic-item flex-1">
          <span class="characteristic-label">Mandate:</span>
          <span class="characteristic-value">Discretionary</span>
        </div>
        <div class="characteristic-item flex-1">
          <span class="characteristic-label">Financial Literacy:</span>
          <span class="characteristic-value">Medium</span>
        </div>
        <div class="characteristic-item flex-1">
          <span class="characteristic-label">Risk Aversion:</span>
          <span class="characteristic-value">High</span>
        </div>
      </div>
      
      <div class="right-section flex items-center">
        <!-- Search bar -->
        <div class="search-container flex items-center mr-4">
          <div class="relative w-[280px]">
            <SInput 
              v-model="searchQuery"
              class="h-[40px] w-full rounded-full pl-10" 
              placeholder="Search insights..." 
              @keyup.enter="handleSearch"
              :disabled="isLoading"
            />
            <span class="absolute left-0 inset-y-0 flex items-center justify-center px-3">
              <Icon v-if="!isLoading" name="i-ph-magnifying-glass" class="size-4 text-[#DE3819]" />
              <div v-else class="animate-spin size-4 text-[#DE3819]">
                <Icon name="i-ph-spinner" class="size-4" />
              </div>
            </span>
            <button 
              @click="handleSearch" 
              class="absolute right-0 inset-y-0 flex items-center justify-center px-3"
              :disabled="isLoading || !searchQuery.trim()"
            >
              <span 
                class="px-2 py-1 rounded-full bg-[#DE3819] text-white text-xs font-medium" 
                :class="{'opacity-70': isLoading || !searchQuery.trim()}"
              >
                Search
              </span>
            </button>
          </div>
        </div>
        
        <div class="avatar bg-white flex items-center justify-center">
          <Icon name="i-cuida-sliders-outline" class="size-6 text-[#292929] rounded-full" /> 
        </div>
      </div>
    </div>

    <!-- Main dashboard grid -->
    <div class="dashboard-grid">
      <!-- Stock tickers row -->
      <div class="stock-tickers flex-col bg-[#F6F6F6] rounded-[20px] p-4">
          <div class="flex gap-4">
            <div class="ticker-card">
              <h3>MSFT</h3>
              <span class="percentage positive">+1.2%</span>
              <div class="ticker-chart-area h-[60px]">
                <Line v-if="msftTickerData" :data="msftTickerData" :options="tickerChartOptions" />
              </div>
            </div>
            <div class="ticker-card">
              <h3>AAPL</h3>
              <span class="percentage positive">+2.1%</span>
              <div class="ticker-chart-area h-[60px]">
                <Line v-if="aaplTickerData" :data="aaplTickerData" :options="tickerChartOptions" />
              </div>
            </div>
            <div class="ticker-card">
              <h3>AMZN</h3>
              <span class="percentage positive">+3.2%</span>
              <div class="ticker-chart-area h-[60px]">
                <Line v-if="amznTickerData" :data="amznTickerData" :options="tickerChartOptions" />
              </div>
            </div>
            <div class="add-ticker">
                <Icon name="i-ph-plus-thin" class="size-12 text-[#F96E53]" />
            </div>
          </div>
          <!-- Compare performance section -->
          <div class="compare-section">
            <h3>Compare performance</h3>
            <p>Related</p>
          </div>
      </div>


      <!-- Stock performance card -->
      <div class="performance-card bg-[#F6F6F6] rounded-[20px] p-4 shadow-sm">
        <div class="bg-white rounded-[25px] p-3 mb-2">
            <div class="card-header flex justify-between items-center mb-2">
            <span class="chart-icon">
                <Icon name="i-ph-chart-line-up" class="size-5 text-gray-700" />
            </span>
            <span class="price text-[#000000] font-semibold text-base"><span class="text-[#DE3819]">$</span>117.52USD</span>
            </div>
            <div class="chart-area h-[180px] mb-2">
            <div class="relative h-full w-full">
              <Line v-if="msftChartData" :data="msftChartData" :options="msftChartOptions" />
              <p v-else>Loading MSFT Data...</p>
            </div>
            </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Stock performance</h3>
          <button class="view-button bg-[#F96E53] text-white py-1 px-3 rounded-full flex items-center gap-1 text-sm">
            View <Icon name="i-ph-arrow-right" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Revenue Card -->
      <div class="revenue-card bg-[#F6F6F6] rounded-[20px] p-4 shadow-sm">
        <div class="bg-white rounded-[25px] p-3 mb-2">
            <div class="card-header flex justify-between items-center mb-2">
            <span class="chart-icon">
                <Icon name="i-ph-money" class="size-5 text-gray-700" />
            </span>
            <span class="price text-[#000000] font-semibold text-base"><span class="text-[#DE3819]">$</span>29.4B</span>
            </div>
            <div class="chart-area h-[180px] mb-2">
            <div class="relative h-full w-full">
              <Line v-if="aaplChartData" :data="aaplChartData" :options="aaplChartOptions" />
              <p v-else>Loading AAPL Data...</p>
            </div>
            </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Revenue</h3>
          <button class="view-button bg-[#F96E53] text-white py-1 px-3 rounded-full flex items-center gap-1 text-sm">
            View <Icon name="i-ph-arrow-right" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Forecast Card -->
      <div class="forecast-card bg-[#F6F6F6] rounded-[20px] p-4 shadow-sm">
        <div class="bg-white rounded-[25px] p-3 mb-2">
            <div class="card-header flex justify-between items-center mb-2">
            <span class="chart-icon">
                <Icon name="i-ph-chart-bar" class="size-5 text-gray-700" />
            </span>
            <span class="price text-[#000000] font-semibold text-base"><span class="text-[#DE3819]">$</span>142.75USD</span>
            </div>
            <div class="chart-area h-[180px] mb-2">
            <div class="relative h-full w-full">
              <Line v-if="amznChartData" :data="amznChartData" :options="amznChartOptions" />
              <p v-else>Loading AMZN Data...</p>
            </div>
            </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Price Forecast</h3>
          <button class="view-button bg-[#F96E53] text-white py-1 px-3 rounded-full flex items-center gap-1 text-sm">
            View <Icon name="i-ph-arrow-right" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Voice assistant area -->
      <div class="voice-assistant">
        <SenseLogo v-model:isListening="isListening" />
        <p v-if="isListening" class="listening-text">Listening...</p>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <button class="insights-button">
          More insights
          <Icon name="i-heroicons-plus" class="size-5 text-white" />
        </button>
        <button class="share-button flex items-center gap-2 text-[#F96E53] border border-[#F96E53] rounded-full" @click="showSharePopup">
          <span class="text-[#F96E53]">Share insights with Client</span>
          <Icon name="i-heroicons-share" class="size-5 text-[#F96E53]" />
        </button>
      </div>

      <!-- Share Popup -->
      <Transition name="fade">
        <div v-if="isPopupVisible" class="share-popup-overlay" @click.self="closePopup">
          <div class="share-popup">
            <div class="popup-icon">
              <Icon name="i-heroicons-check-circle" class="size-12 text-[#34D399]" />
            </div>
            <h3 class="popup-title">Custom dashboard for {{ clientName }} created</h3>
            <p class="popup-message">Copied to clipboard, share with one click</p>
            <button @click="closePopup" class="popup-close-btn">
              <Icon name="i-heroicons-x-mark" class="size-5" />
            </button>
          </div>
        </div>
      </Transition>

      <!-- Toast Notification -->
      <Transition name="toast">
        <div v-if="isToastVisible" class="toast-notification">
          <Icon name="i-heroicons-clipboard-document-check" class="size-5 mr-2 text-white" />
          <span>Link copied to clipboard</span>
        </div>
      </Transition>

      <!-- Query chips -->
      <div class="query-chips">
        <div class="chip volatile">" ...volatile..."</div>
        <div class="chip tech">" ...leading tech..."</div>
        <div class="chip nvidia">" Compare NVIDIA "</div>
        <div class="chip administration">" ...new administration "</div>
        <div class="chip crash">" market crash "</div>
        <div class="chip msft">" MSFT "</div>
        <div class="chip nasdaq">" NASDAQ "</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isListening = ref(false);
const searchQuery = ref('');
const isLoading = ref(false);
const currentJobId = ref<string | null>(null);
const result = ref<any>('');
const user = useSupabaseUser();

// Get socket instance
const { $socket } = useNuxtApp();

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
const handlePartialVisualization = async (data: { userId: string, visualizationData: any }) => {
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
    
    // For partial UI updates - simplified for dashboard display
    console.log('[Visualization] Processing partial result for query:', searchQuery.value);
    
  } catch (error) {
    console.error('[Visualization] Error handling partial visualization:', error);
  }
};

// Handle complete visualization update (all tool results)
const handleCompleteVisualization = async (data: { userId: string, visualizationData: any }) => {
  try {
    const visualizationData = data.visualizationData;
    console.log('[Visualization] Received complete visualization:', visualizationData);
    
    // Check if this is for our current query
    if (visualizationData.query !== searchQuery.value) {
      console.log('[Visualization] Ignoring complete result for different query');
      return;
    }
    
    // Process the complete result - simplified for dashboard
    console.log('[Visualization] Processing complete result for query:', searchQuery.value);
    
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
        source: 'header-search-bar'
      }
    };
    
    // Add to the pipeline via API endpoint
    const response = await $fetch<any>('/api/pipeline/add-event', {
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
  
  // Add the query to the data processing pipeline
  const pipelineResult = await addQueryToPipeline(searchQuery.value);
  console.log('[Search] Pipeline result:', pipelineResult ? 'Added to pipeline' : 'Failed to add to pipeline');
  
  // If adding to pipeline failed, end loading state
  if (!pipelineResult) {
    isLoading.value = false;
  }
};

// You might want to add a function to toggle listening state
const toggleListening = () => {
  isListening.value = !isListening.value;
};

const isPopupVisible = ref(false);
const isToastVisible = ref(false);
const clientName = ref('');

const showSharePopup = () => {
  // Create shareable link
  const shareableLink = `https://financial-browser/dashboard/${Date.now()}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareableLink)
    .then(() => {
      console.log('Dashboard link copied to clipboard');
    })
    .catch(err => {
      console.error('Could not copy text: ', err);
    });
  
  isPopupVisible.value = true;
  clientName.value = 'Zeno Hamers';
  
  // Auto-hide popup after 3 seconds
  setTimeout(() => {
    isPopupVisible.value = false;
  }, 3000);
};

const closePopup = () => {
  isPopupVisible.value = false;
  
  // Show toast notification
  isToastVisible.value = true;
  setTimeout(() => {
    isToastVisible.value = false;
  }, 2000);
};

// Common chart options with smaller font size for labels
const commonChartOptions = {
  responsive: true,
  scales: {
    y: {
      beginAtZero: false,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
      ticks: {
        font: {
          size: 10 // Smaller font size
        }
      }
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 8 // Smaller font size for x-axis
        },
        maxRotation: 0 // Prevent rotation of labels
      }
    }
  },
  plugins: {
    legend: {
      display: false
    }
  }
};

// Ticker specific chart options - even more minimal
const tickerChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      display: false // No y-axis for ticker charts
    },
    x: {
      display: false // No x-axis for ticker charts
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false // Disable tooltips for ticker charts
    }
  },
  elements: {
    point: {
      radius: 0 // No points on the line
    },
    line: {
      tension: 0.4 // Smooth curve
    }
  }
};

// --- Data and Options for MSFT ---
const msftChartData = ref<ChartData<'line'> | null>(null);
const msftChartOptions = ref(commonChartOptions);
const msftTickerData = ref<ChartData<'line'> | null>(null);

// --- Data and Options for AAPL ---
const aaplChartData = ref<ChartData<'line'> | null>(null);
const aaplChartOptions = ref(commonChartOptions);
const aaplTickerData = ref<ChartData<'line'> | null>(null);

// --- Data and Options for AMZN ---
const amznChartData = ref<ChartData<'line'> | null>(null);
const amznChartOptions = ref(commonChartOptions);
const amznTickerData = ref<ChartData<'line'> | null>(null);

// --- Interfaces for Type Safety ---
interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  "Total return": string;
  "Anualized return": string;
  Max: number;
  Min: number;
}

interface StockData {
  [date: string]: OHLCVData;
}

interface CompanyData {
  [companyName: string]: StockData;
}

interface OHLCVResponse {
  message: string;
  object: string; // Keep this as string since it's raw JSON
}

// --- Data Constants (using template literals for the JSON) ---

const MSFT_OHLCV: OHLCVResponse = {
  "message": "Plots correctly shown to user. Answer the user.\n\n|              |   First |   Last |   Min |    Max | Return   |\n|:-------------|--------:|-------:|------:|-------:|:---------|\n| Microsoft Rg |  373.69 | 386.84 | 366.5 | 468.33 | 4.22%    |",
  "object": `{
    "tool": "OHLC", "data": {
        "Microsoft Rg": {
            "2024-01-02T00:00:00.000":{
                "open":373.69,
                "high":375.9,
                "low":366.8,
                "close":370.87,
                "vol":9512457,
                "Total return":"0.00%",
                "Anualized return":"0.00%",
                "Max":375.9,
                "Min":366.8
            },
            "2024-01-03T00:00:00.000":{
                "open":369.15,
                "high":373.25,
                "low":368.54,
                "close":370.6,
                "vol":7687170,
                "Total return":"-0.07%",
                "Anualized return":"-23.35%",
                "Max":375.9,
                "Min":366.8
            },
            "2024-01-04T00:00:00.000":{
                "open":370.83,
                "high":373.1,
                "low":367.18,
                "close":367.94,
                "vol":7638925,
                "Total return":"-0.79%",
                "Anualized return":"-76.62%",
                "Max":375.9,
                "Min":366.8
            },
            "2024-01-05T00:00:00.000":{
                "open":369.04,
                "high":372.05,
                "low":369.04,
                "close":370.05,
                "vol":7638925,
                "Total return":"-0.79%",
                "Anualized return":"-76.62%",
                "Max":375.9,
                "Min":366.8
            },
            "...": {}
        }
    }
}`
};

const APPL_OHLCV: OHLCVResponse = {
  "message": "Plots correctly shown to user. Answer the user.\n\n|          |   First |   Last |    Min |    Max | Return   |\n|:---------|--------:|-------:|-------:|-------:|:---------|\n| Apple Rg |  187.03 |  214.1 | 164.08 | 260.09 | 14.26%   |",
  "object": `{
    "tool": "OHLC", "data": {
        "Apple Rg": {
            "2024-01-02T00:00:00.000":{
                "open":187.03,
                "high":188.43,
                "low":183.89,
                "close":185.64,
                "vol":22968773,
                "Total return":"0.00%",
                "Anualized return":"0.00%",
                "Max":188.43,
                "Min":183.89
            },
            "2024-01-03T00:00:00.000":{
                "open":184.2,
                "high":185.87,
                "low":183.44,
                "close":184.25,
                "vol":16179899,
                "Total return":"-0.75%",
                "Anualized return":"-93.63%",
                "Max":188.43,
                "Min":183.44
            },
            "2024-01-04T00:00:00.000":{
                "open":182.0,
                "high":183.08,
                "low":180.88,
                "close":181.91,
                "vol":17660045,
                "Total return":"-2.03%",
                "Anualized return":"-97.63%",
                "Max":188.43,
                "Min":180.88
            },
            "2024-01-05T00:00:00.000":{
                "open":181.9,
                "high":182.76,
                "low":180.17,
                "close":181.18,
                "vol":18597031,
                "Total return":"-2.42%",
                "Anualized return":"-98.22%",
                "Max":188.43,
                "Min":180.17
            },
            "...": {}
        }
    }
}`
};

const AMZN_OHLCV: OHLCVResponse = {
  "message": "Plots correctly shown to user. Answer the user.\n\n|               |   First |   Last |    Min |    Max | Return   |\n|:--------------|--------:|-------:|-------:|-------:|:---------|\n| Amazon.Com Rg |  151.64 | 194.95 | 144.05 | 242.51 | 26.26%   |",
  "object": `{
    "tool": "OHLC", "data": {
        "Amazon.Com Rg": {
            "2024-01-02T00:00:00.000": {
                "open": 151.64,
                "high": 152.37,
                "low": 148.4,
                "close": 149.93,
                "vol": 12369535,
                "Total return": "0.00%",
                "Anualized return": "0.00%",
                "Max": 152.37,
                "Min": 148.4
            },
            "2024-01-03T00:00:00.000": {
                "open": 149.16,
                "high": 151.04,
                "low": 148.34,
                "close": 148.47,
                "vol": 12548741,
                "Total return": "-0.98%",
                "Anualized return": "-97.24%",
                "Max": 152.37,
                "Min": 148.34
            },
            "2024-01-04T00:00:00.000": {
                "open": 145.63,
                "high": 147.37,
                "low": 144.05,
                "close": 144.57,
                "vol": 15355039,
                "Total return": "-3.64%",
                "Anualized return": "-99.88%",
                "Max": 152.37,
                "Min": 144.05
            },
            "2024-01-05T00:00:00.000": {
                "open": 144.61,
                "high": 146.59,
                "low": 144.53,
                "close": 145.24,
                "vol": 14704172,
                "Total return": "-3.13%",
                "Anualized return": "-99.83%",
                "Max": 152.37,
                "Min": 144.05
            },
            "...": {}
        }
    }
}`
};

onMounted(() => {
  // Simulate data loading with different delays
  setTimeout(() => {
    const parsedData: CompanyData = JSON.parse(MSFT_OHLCV.object).data;
    const closePrices = Object.values(parsedData["Microsoft Rg"]).map((item: OHLCVData) => item.close);
    const labels = Object.keys(parsedData["Microsoft Rg"]);
    
    // Create main chart data
    msftChartData.value = {
      labels: labels,
      datasets: [{
        label: 'MSFT Stock Price',
        data: closePrices,
        borderColor: '#F96E53',
        backgroundColor: 'rgba(249, 110, 83, 0.2)',
        tension: 0.4,
        pointRadius: 0,
      }]
    };
    
    // Create ticker mini chart data
    msftTickerData.value = {
      labels: labels,
      datasets: [{
        label: 'MSFT',
        data: closePrices,
        borderColor: '#F96E53',
        backgroundColor: 'rgba(249, 110, 83, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }, 500);

  setTimeout(() => {
    const parsedData: CompanyData = JSON.parse(APPL_OHLCV.object).data;
    const closePrices = Object.values(parsedData["Apple Rg"]).map((item: OHLCVData) => item.close);
    const labels = Object.keys(parsedData["Apple Rg"]);
    
    // Create main chart data
    aaplChartData.value = {
      labels: labels,
      datasets: [{
        label: 'AAPL Stock Price',
        data: closePrices,
        borderColor: '#F96E53',
        backgroundColor: 'rgba(249, 110, 83, 0.2)',
        tension: 0.4,
        pointRadius: 0,
      }]
    };
    
    // Create ticker mini chart data
    aaplTickerData.value = {
      labels: labels,
      datasets: [{
        label: 'AAPL',
        data: closePrices,
        borderColor: '#F96E53',
        backgroundColor: 'rgba(249, 110, 83, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }, 1500);

  setTimeout(() => {
    const parsedData: CompanyData = JSON.parse(AMZN_OHLCV.object).data;
    const closePrices = Object.values(parsedData["Amazon.Com Rg"]).map((item: OHLCVData) => item.close);
    const labels = Object.keys(parsedData["Amazon.Com Rg"]);
    
    // Create main chart data
    amznChartData.value = {
      labels: labels,
      datasets: [{
        label: 'AMZN Stock Price',
        data: closePrices,
        borderColor: '#F96E53',
        backgroundColor: 'rgba(249, 110, 83, 0.2)',
        tension: 0.4,
        pointRadius: 0,
      }]
    };
    
    // Create ticker mini chart data
    amznTickerData.value = {
      labels: labels,
      datasets: [{
        label: 'AMZN',
        data: closePrices,
        borderColor: '#F96E53',
        backgroundColor: 'rgba(249, 110, 83, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }, 1000);
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  border-radius: 20px;
  margin: 0 auto;
  font-family: 'Arial', sans-serif;
}

.client-profile {
  border-radius: 20px;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: nowrap;
}

.profile-info {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-shrink: 0;
  padding-right: 10px;
}

.profile-characteristics {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 10px;
}

.characteristic-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  background-color: white;
  border-radius: 10px;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
}

.characteristic-label {
  font-size: 12px;
  color: #626262;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

.characteristic-value {
  font-size: 12px;
  font-weight: 600;
  color: #3E3E3E;
  overflow: hidden;
  text-overflow: ellipsis;
}

.right-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.search-container {
  margin-right: 15px;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-gap: 15px;
  position: relative;
}

.stock-tickers {
  grid-column: 1 / 10;
  grid-row: 1;
  display: flex;
  width: 100%;
  gap: 15px;
  margin-bottom: 20px;
}

.ticker-card {
  background-color: white;
  border-radius: 25px;
  padding: 15px;
  height: 150px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ticker-chart-area {
  margin-top: auto;
  width: 100%;
}

.add-ticker {
  background-color: #F7DBD5;
  border-radius: 25px;
  display: flex;
  width: 94px;
  height: 94px;
  justify-content: center;
  align-items: center;
  border: 1px solid #F96E53;
  font-size: 24px;
  flex: 0.5;
}

.compare-section {
  grid-column: 3 / 10;
  grid-row: 2;
  border-radius: 15px;
  padding: 15px;
}

.compare-section h3 {
    font-size: 18px;
    font-weight: 600;
}

.compare-section p {
    font-size: 12px;
    font-weight: 400;
}

.performance-card {
  grid-column: 1 / 4;
  grid-row: 2;
  background-color: #F6F6F6;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.revenue-card {
  grid-column: 4 / 7;
  grid-row: 2;
  background-color: #F6F6F6;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.forecast-card {
  grid-column: 7 / 10;
  grid-row: 2;
  background-color: #F6F6F6;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.circular-progress {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(#ff6b6b 46%, #e0e0e0 0);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.circular-progress::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: white;
}

.percentage, .label {
  position: relative;
  z-index: 2;
}

.percentage {
  font-size: 24px;
  font-weight: bold;
}

.lock-card {
  grid-column: 10 / 12;
  grid-row: 3;
  background-color: white;
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.carousel-nav {
  grid-column: 8 / 12;
  grid-row: 4;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-buttons {
  grid-column: 2 / 10;
  grid-row: 5;
  display: flex;
  gap: 15px;
  justify-content: center;
}

.insights-button, .share-button {
  padding: 12px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.insights-button {
  background-color: #ff6b6b;
  color: white;
}

.share-button {
  background-color: white;
  color: #333;
}

.query-chips {
  grid-column: 10 / 13;
  grid-row: 1 / 4;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chip {
  padding: 12px 15px;
  border-radius: 30px;
  text-align: center;
  font-size: 14px;
}

.volatile {
  background-color: #ff8f8f;
  color: white;
}

.tech {
  background-color: #f9edcf;
}

.nvidia {
  background-color: #e0cfff;
}

.administration {
  background-color: #c7f5d9;
}

.crash {
  background-color: #c7f5f5;
}

.msft {
  background-color: #ffa58f;
}

.nasdaq {
  background-color: #d0c7ff;
}

.voice-assistant {
  position: absolute;
  right: 0px;
  bottom: -100px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mic-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #ffede8;
  padding: 10px 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.listening-text {
  color: #ff6b6b;
}

.percentage.positive {
  color: #F96E53;
  background-color: #ffedea;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.view-button {
  background-color: #F96E53;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 20px;
}

.share-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.share-popup {
  background-color: white;
  padding: 30px 40px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  position: relative;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.popup-icon {
  margin-bottom: 15px;
  display: inline-flex;
  background-color: rgba(52, 211, 153, 0.1);
  border-radius: 50%;
  padding: 15px;
}

.popup-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.popup-message {
  margin-bottom: 20px;
  color: #666;
  font-size: 16px;
}

.popup-close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #f5f5f5;
  color: #666;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.popup-close-btn:hover {
  background-color: #F96E53;
  color: white;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Toast notification */
.toast-notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4B5563;
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  z-index: 1000;
}

.toast-enter-active,
.toast-leave-active {
  transition: transform 0.3s, opacity 0.3s;
}

.toast-enter-from,
.toast-leave-to {
  transform: translate(-50%, 20px);
  opacity: 0;
}
</style>
