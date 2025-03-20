<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <!-- Header with stock info -->
    <div class="p-4 border-b flex justify-between items-center">
      <div>
        <h3 class="text-lg font-semibold">{{ stockData.symbol }}</h3>
        <p class="text-sm text-gray-500">{{ stockData.name }}</p>
      </div>
      <div class="text-right">
        <div class="text-xl font-bold">{{ formatPrice(stockData.lastPrice) }}</div>
        <div :class="[
          'text-sm font-medium flex items-center',
          parseFloat(stockData.return) > 0 ? 'text-green-600' : 'text-red-600'
        ]">
          <svg v-if="parseFloat(stockData.return) > 0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
            <path d="m18 9-6-6-6 6"/>
            <path d="M6 20h12"/>
            <path d="M12 3v17"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
            <path d="m18 15-6 6-6-6"/>
            <path d="M6 4h12"/>
            <path d="M12 20V3"/>
          </svg>
          {{ stockData.return }}
        </div>
      </div>
    </div>
    
    <!-- Price metrics -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="flex flex-col">
        <span class="text-sm text-gray-500">First Price</span>
        <span class="font-medium">{{ formatPrice(stockData.firstPrice) }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-sm text-gray-500">Last Price</span>
        <span class="font-medium">{{ formatPrice(stockData.lastPrice) }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-sm text-gray-500">Min Price</span>
        <span class="font-medium">{{ formatPrice(stockData.minPrice) }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-sm text-gray-500">Max Price</span>
        <span class="font-medium">{{ formatPrice(stockData.maxPrice) }}</span>
      </div>
    </div>
    
    <!-- Price position within range -->
    <div class="p-4 pt-0">
      <div class="text-sm text-gray-500 mb-1">Price position within range</div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary"
          :style="{ width: `${calculateRelativePosition()}%` }"
        ></div>
      </div>
      <div class="flex justify-between text-xs text-gray-500 mt-1">
        <span>{{ formatPrice(stockData.minPrice) }}</span>
        <span>{{ formatPrice(stockData.maxPrice) }}</span>
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

// Format price as USD currency
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price)
}

// Calculate the relative position of the last price within the min-max range
const calculateRelativePosition = (): number => {
  const { lastPrice, minPrice, maxPrice } = props.stockData
  
  // Avoid division by zero
  if (maxPrice === minPrice) return 50
  
  const position = ((lastPrice - minPrice) / (maxPrice - minPrice)) * 100
  
  // Constrain between 0 and 100
  return Math.max(0, Math.min(100, position))
}
</script> 