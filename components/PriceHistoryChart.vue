<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Price History</h3>
      <p class="text-sm text-gray-500">Historical stock price performance</p>
    </div>
    
    <div class="p-4 h-64 relative">
      <!-- This would be replaced with a real chart library in production -->
      <div class="absolute inset-0 p-4 flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 300 200" preserveAspectRatio="none">
          <!-- Y-axis labels -->
          <text x="5" y="15" font-size="10" text-anchor="start" class="text-gray-500">{{ formatPrice(stockData.maxPrice) }}</text>
          <text x="5" y="100" font-size="10" text-anchor="start" class="text-gray-500">{{ formatPrice((stockData.maxPrice + stockData.minPrice) / 2) }}</text>
          <text x="5" y="195" font-size="10" text-anchor="start" class="text-gray-500">{{ formatPrice(stockData.minPrice) }}</text>
          
          <!-- X-axis labels -->
          <text x="40" y="195" font-size="10" text-anchor="middle" class="text-gray-500">Jan</text>
          <text x="120" y="195" font-size="10" text-anchor="middle" class="text-gray-500">Apr</text>
          <text x="200" y="195" font-size="10" text-anchor="middle" class="text-gray-500">Jul</text>
          <text x="280" y="195" font-size="10" text-anchor="middle" class="text-gray-500">Oct</text>
          
          <!-- Chart grid lines -->
          <line x1="30" y1="0" x2="30" y2="180" stroke="#e5e5e5" stroke-width="1" />
          <line x1="30" y1="180" x2="300" y2="180" stroke="#e5e5e5" stroke-width="1" />
          <line x1="30" y1="90" x2="300" y2="90" stroke="#e5e5e5" stroke-width="1" stroke-dasharray="4" />
          
          <!-- Price line -->
          <polyline
            :points="generateDummyChartPath()"
            fill="none"
            :stroke="parseFloat(stockData.return) >= 0 ? '#16a34a' : '#dc2626'"
            stroke-width="2"
          />
          
          <!-- End point -->
          <circle 
            :cx="280" 
            :cy="generateEndPointY()" 
            r="4" 
            :fill="parseFloat(stockData.return) >= 0 ? '#16a34a' : '#dc2626'" 
          />
        </svg>
      </div>
    </div>
    
    <div class="p-4 border-t flex justify-between items-center">
      <div class="text-sm text-gray-500">
        Period: <span class="font-medium">1 Year</span>
      </div>
      <div :class="[
        'flex items-center text-sm font-medium',
        parseFloat(stockData.return) >= 0 ? 'text-green-600' : 'text-red-600'
      ]">
        <svg v-if="parseFloat(stockData.return) >= 0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
          <path d="m18 9-6-6-6 6"/>
          <path d="M6 20h12"/>
          <path d="M12 3v17"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
          <path d="m18 15-6 6-6-6"/>
          <path d="M6 4h12"/>
          <path d="M12 20V3"/>
        </svg>
        Total Return: {{ stockData.return }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const props = defineProps<{
  stockData: StockData
}>()

// Format price as USD
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price)
}

// Generate a dummy chart path based on the stock data
// In a real implementation, this would use the actual price data points
const generateDummyChartPath = (): string => {
  // Starting point (x=30, y based on first price)
  const startX = 30
  const endX = 280
  const returnValue = parseFloat(props.stockData.return)
  const points = []
  
  // Create a simple sine wave with a bias towards the return value
  for (let x = startX; x <= endX; x += 10) {
    const progress = (x - startX) / (endX - startX)
    const wave = Math.sin(progress * Math.PI * 2) * 20
    
    // Bias the trend upward or downward based on return
    const trend = progress * (returnValue >= 0 ? -40 : 40)
    
    // Map to Y coordinate (y=0 at top, y=180 at bottom)
    const y = 90 + wave + trend
    
    points.push(`${x},${y}`)
  }
  
  return points.join(' ')
}

// Calculate Y position for the last price
const generateEndPointY = (): number => {
  const { minPrice, maxPrice, lastPrice } = props.stockData
  const range = maxPrice - minPrice
  
  // Avoid division by zero
  if (range === 0) return 90
  
  // Map the price to a position on the chart (y=0 at top, y=180 at bottom)
  // Invert the position because SVG's y-axis is inverted (0 is at the top)
  const position = 1 - ((lastPrice - minPrice) / range)
  return 10 + (position * 170)
}
</script> 