<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <!-- Chart Header with controls -->
    <div class="p-4 border-b flex justify-between items-center">
      <div>
        <h3 class="text-lg font-semibold">Price History</h3>
        <p class="text-sm text-gray-500">Historical stock price performance</p>
      </div>
      <div class="flex space-x-2">
        <!-- Chart Type Selection -->
        <div class="chart-controls">
          <select v-model="selectedChartType" class="text-sm border rounded px-2 py-1">
            <option value="line">Line</option>
            <option value="candlestick">Candlestick</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Chart time period selection -->
    <div class="px-4 py-2 border-b flex justify-between items-center">
      <div class="flex space-x-1">
        <button 
          v-for="period in timePeriods" 
          :key="period.value" 
          @click="setTimePeriod(period.value)"
          :class="[
            'px-3 py-1 text-xs font-medium rounded',
            selectedPeriod === period.value 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ period.label }}
        </button>
      </div>
      
      <!-- Technical indicators toggle -->
      <div class="flex items-center">
        <button 
          @click="showVolume = !showVolume"
          :class="[
            'px-3 py-1 text-xs font-medium rounded mr-2',
            showVolume ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          Volume
        </button>
        <button 
          @click="showMA = !showMA"
          :class="[
            'px-3 py-1 text-xs font-medium rounded',
            showMA ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          MA(50)
        </button>
      </div>
    </div>
    
    <div class="p-4 h-64 relative">
      <!-- Placeholder for no data -->
      <div v-if="!stockData.priceData || stockData.priceData.length === 0" class="absolute inset-0 flex items-center justify-center">
        <p class="text-gray-500">No price data available</p>
      </div>
      
      <!-- Chart display -->
      <div v-else class="absolute inset-0 p-4 flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 300 200" preserveAspectRatio="none">
          <!-- Y-axis labels -->
          <text x="30" y="15" font-size="10" text-anchor="end" class="text-gray-500">{{ formatPrice(yAxisMax) }}</text>
          <text x="30" y="95" font-size="10" text-anchor="end" class="text-gray-500">{{ formatPrice(yAxisMiddle) }}</text>
          <text x="30" y="175" font-size="10" text-anchor="end" class="text-gray-500">{{ formatPrice(yAxisMin) }}</text>
          
          <!-- X-axis labels -->
          <template v-for="(label, index) in xAxisLabels" :key="index">
            <text 
              :x="40 + (index * ((260) / (xAxisLabels.length - 1)))" 
              y="195" 
              font-size="10" 
              text-anchor="middle" 
              class="text-gray-500"
            >
              {{ label }}
            </text>
          </template>
          
          <!-- Chart grid lines -->
          <line x1="40" y1="10" x2="40" y2="180" stroke="#e5e5e5" stroke-width="1" />
          <line x1="40" y1="180" x2="300" y2="180" stroke="#e5e5e5" stroke-width="1" />
          <line x1="40" y1="95" x2="300" y2="95" stroke="#e5e5e5" stroke-width="1" stroke-dasharray="4" />
          
          <!-- Volume bars if enabled -->
          <g v-if="showVolume && hasMultipleDataPoints">
            <template v-for="(point, index) in normalizedPriceData" :key="'vol-'+index">
              <rect 
                :x="40 + (index * barWidth)" 
                :y="180 - (point.normalizedVolume * 40)" 
                :width="Math.max(barWidth - 1, 1)" 
                :height="point.normalizedVolume * 40"
                :fill="point.close >= point.open ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)'"
              />
            </template>
          </g>
          
          <!-- Moving Average line if enabled -->
          <polyline
            v-if="showMA && movingAveragePath && movingAveragePath.length > 0"
            :points="movingAveragePath"
            fill="none"
            stroke="#6366f1"
            stroke-width="1.5"
            stroke-dasharray="2"
          />
          
          <!-- Price line or candlesticks based on selected type -->
          <template v-if="selectedChartType === 'line'">
            <polyline
              v-if="chartPath && chartPath.length > 0"
              :points="chartPath"
              fill="none"
              :stroke="parseFloat(stockData.return) >= 0 ? '#16a34a' : '#dc2626'"
              stroke-width="2"
            />
          </template>
          
          <template v-else-if="selectedChartType === 'candlestick' && hasMultipleDataPoints">
            <template v-for="(point, index) in normalizedPriceData" :key="'candle-'+index">
              <!-- Candlestick wick -->
              <line 
                :x1="40 + (index * barWidth) + (barWidth / 2)" 
                :y1="point.highY" 
                :x2="40 + (index * barWidth) + (barWidth / 2)" 
                :y2="point.lowY"
                stroke="#718096"
                stroke-width="1"
              />
              
              <!-- Candlestick body -->
              <rect 
                :x="40 + (index * barWidth) + (barWidth * 0.1)" 
                :y="Math.min(point.openY, point.closeY)" 
                :width="barWidth * 0.8" 
                :height="Math.max(2, Math.abs(point.closeY - point.openY))"
                :fill="point.close >= point.open ? '#16a34a' : '#dc2626'"
              />
            </template>
          </template>
          
          <!-- End point marker for line chart -->
          <circle 
            v-if="selectedChartType === 'line' && endPoint && typeof endPoint.x === 'number' && !isNaN(endPoint.x) && 
                  typeof endPoint.y === 'number' && !isNaN(endPoint.y)"
            :cx="endPoint.x" 
            :cy="endPoint.y" 
            r="4" 
            :fill="parseFloat(stockData.return) >= 0 ? '#16a34a' : '#dc2626'" 
          />
        </svg>
      </div>
    </div>
    
    <!-- Chart footer -->
    <div class="p-4 border-t flex justify-between items-center">
      <div class="text-sm text-gray-500">
        Period: <span class="font-medium">{{ getPeriodLabel() }}</span>
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
    
    <!-- Show debug info for development only -->
    <div v-if="showDebugInfo" class="p-4 border-t text-xs">
      <div class="mb-1">Chart Type: {{ selectedChartType }}</div>
      <div class="mb-1">Period: {{ selectedPeriod }}</div>
      <div class="mb-1">Data Points: {{ stockData.priceData?.length || 0 }}</div>
      <div class="mb-1">Features: {{ showVolume ? 'Volume, ' : '' }}{{ showMA ? 'MA(50), ' : '' }}</div>
      <button @click="showDebugInfo = false" class="text-xs text-gray-500">Hide Debug</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface NormalizedPricePoint extends PriceDataPoint {
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  normalizedVolume: number;
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
}

const props = defineProps<{
  stockData: StockData
}>()

// UI State
const selectedChartType = ref('line')
const selectedPeriod = ref('1y')
const showVolume = ref(false)
const showMA = ref(false)
const showDebugInfo = ref(process.env.NODE_ENV === 'development')

// Chart configuration
const timePeriods = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' }
]

// Chart data helpers
const hasMultipleDataPoints = computed(() => {
  return props.stockData.priceData && props.stockData.priceData.length > 1
})

const barWidth = computed(() => {
  if (!props.stockData.priceData) return 5
  const dataLength = filteredPriceData.value.length
  if (dataLength <= 1) return 20 // Wide bar for single data point
  const availableWidth = 260 // Total chart width minus margins
  return Math.max(availableWidth / dataLength, 1) // Ensure minimum width
})

// Computed values for Y-axis
const yAxisPadding = 0.1 // Add 10% padding to top and bottom
const yAxisMin = computed(() => {
  if (!props.stockData.priceData || props.stockData.priceData.length === 0) {
    console.log('No price data for yAxisMin, using minPrice:', props.stockData.minPrice)
    return props.stockData.minPrice
  }
  
  try {
    // Filter out any invalid values before finding min
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.low === 'number' && !isNaN(d.low)
    )
    
    if (validData.length === 0) {
      console.log('No valid price data for yAxisMin, using minPrice:', props.stockData.minPrice)
      return props.stockData.minPrice
    }
    
    const min = Math.min(...validData.map(d => d.low))
    
    // Ensure min is a valid number
    if (isNaN(min) || min === Infinity || min === -Infinity) {
      console.warn('Invalid min value calculated:', min)
      return props.stockData.minPrice
    }
    
    const range = props.stockData.maxPrice - min
    const paddedMin = Math.max(0, min - (range * yAxisPadding))
    
    console.log(`Calculated yAxisMin: ${paddedMin} from min: ${min}`)
    return paddedMin
  } catch (e) {
    console.error('Error calculating yAxisMin:', e)
    return props.stockData.minPrice
  }
})

const yAxisMax = computed(() => {
  if (!props.stockData.priceData || props.stockData.priceData.length === 0) {
    console.log('No price data for yAxisMax, using maxPrice:', props.stockData.maxPrice)
    return props.stockData.maxPrice
  }
  
  try {
    // Filter out any invalid values before finding max
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.high === 'number' && !isNaN(d.high)
    )
    
    if (validData.length === 0) {
      console.log('No valid price data for yAxisMax, using maxPrice:', props.stockData.maxPrice)
      return props.stockData.maxPrice
    }
    
    const max = Math.max(...validData.map(d => d.high))
    
    // Ensure max is a valid number
    if (isNaN(max) || max === Infinity || max === -Infinity) {
      console.warn('Invalid max value calculated:', max)
      return props.stockData.maxPrice
    }
    
    const range = max - props.stockData.minPrice
    const paddedMax = max + (range * yAxisPadding)
    
    console.log(`Calculated yAxisMax: ${paddedMax} from max: ${max}`)
    return paddedMax
  } catch (e) {
    console.error('Error calculating yAxisMax:', e)
    return props.stockData.maxPrice
  }
})

const yAxisMiddle = computed(() => {
  return (yAxisMin.value + yAxisMax.value) / 2
})

// Filter price data based on selected time period
const filteredPriceData = computed(() => {
  if (!props.stockData.priceData || props.stockData.priceData.length === 0) {
    return []
  }
  
  try {
    // Make a copy of the price data to avoid modifying the original
    const sortedData = [...props.stockData.priceData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // If we have only one data point, just return it
    if (sortedData.length === 1) {
      return sortedData
    }
    
    // Filter by time period
    const now = new Date()
    let cutoffDate = new Date()
    
    switch (selectedPeriod.value) {
      case '1d':
        cutoffDate.setDate(now.getDate() - 1)
        break
      case '1w':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
      default:
        // Return all data
        return sortedData
    }
    
    return sortedData.filter(d => new Date(d.date) >= cutoffDate)
  } catch (e) {
    console.error('Error filtering price data:', e)
    return props.stockData.priceData || []
  }
})

// Normalize price data for candlestick rendering
const normalizedPriceData = computed(() => {
  if (!props.stockData.priceData || props.stockData.priceData.length === 0) {
    return []
  }
  
  try {
    const data = filteredPriceData.value
    const min = yAxisMin.value
    const max = yAxisMax.value
    const range = max - min
    
    // Find max volume for normalization
    const maxVolume = Math.max(...data.map(d => d.volume || 0))
    
    return data.map(point => {
      const openY = 10 + (1 - ((point.open - min) / range)) * 170
      const closeY = 10 + (1 - ((point.close - min) / range)) * 170
      const highY = 10 + (1 - ((point.high - min) / range)) * 170
      const lowY = 10 + (1 - ((point.low - min) / range)) * 170
      const normalizedVolume = maxVolume > 0 ? (point.volume || 0) / maxVolume : 0
      
      return {
        ...point,
        openY,
        closeY,
        highY,
        lowY,
        normalizedVolume
      }
    })
  } catch (e) {
    console.error('Error normalizing price data:', e)
    return []
  }
})

// Format X-axis labels based on actual data dates
const xAxisLabels = computed(() => {
  if (!props.stockData.priceData || filteredPriceData.value.length < 2) {
    return ['Jan', 'Apr', 'Jul', 'Oct']
  }
  
  try {
    // Filter out invalid data points
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.date === 'string' && d.date.trim() !== ''
    )
    
    if (validData.length === 0) {
      return ['Jan', 'Apr', 'Jul', 'Oct']
    }
    
    const totalPoints = validData.length
    
    // For small datasets, we may want to show fewer labels
    const numLabels = Math.min(totalPoints, 5)
    
    // Calculate evenly spaced indices
    const indices = []
    for (let i = 0; i < numLabels; i++) {
      const index = Math.min(
        Math.floor(i * (totalPoints - 1) / (numLabels - 1)),
        totalPoints - 1
      )
      indices.push(index)
    }
    
    // Format labels based on the selected time period
    return indices.map(i => {
      try {
        const date = new Date(validData[i].date)
        if (isNaN(date.getTime())) {
          return `Data ${i+1}`
        }
        
        // Format based on selected period
        switch (selectedPeriod.value) {
          case '1d':
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          case '1w':
            return date.toLocaleDateString([], { weekday: 'short' })
          case '1m':
            return `${date.getDate()}/${date.getMonth() + 1}`
          default:
            return date.toLocaleString('default', { month: 'short' })
        }
      } catch (e) {
        console.warn(`Error formatting date at index ${i}:`, e)
        return `Data ${i+1}`
      }
    })
  } catch (e) {
    console.warn('Error in xAxisLabels computation:', e)
    return ['Jan', 'Apr', 'Jul', 'Oct']
  }
})

// Format price as USD with appropriate precision
const formatPrice = (price: number): string => {
  // Use fewer decimal places for larger numbers
  const decimalPlaces = price > 1000 ? 0 : (price > 100 ? 1 : 2)
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(price)
}

// Calculate Y position for a given price value
const calculateYPosition = (price: number): number => {
  try {
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn('Invalid price value:', price)
      return 95 // Default to middle position
    }
    
    const min = yAxisMin.value
    const max = yAxisMax.value
    
    // Ensure we have valid min/max values
    if (isNaN(min) || isNaN(max) || min === undefined || max === undefined) {
      console.warn('Invalid axis bounds:', { min, max })
      return 95
    }
    
    const range = max - min
    
    // Avoid division by zero or very small numbers
    if (range === 0 || Math.abs(range) < 0.0001) {
      console.warn('Range is too small:', range)
      return 95 // Default to middle position
    }
    
    // Map the price to a position on the chart (y=10 at top, y=180 at bottom)
    // Invert the position because SVG's y-axis is inverted (0 is at the top)
    const position = 1 - ((price - min) / range)
    
    // Constrain the result to be within the valid range
    const result = 10 + (position * 170)
    
    // Extra safety check
    if (isNaN(result)) {
      console.warn('Calculated NaN Y position for price:', { price, min, max, range, position })
      return 95
    }
    
    return result
  } catch (e) {
    console.warn('Error calculating Y position:', e)
    return 95 // Default to middle position
  }
}

// Pre-calculate the chart path as a computed property to ensure it's valid
const chartPath = computed(() => {
  if (!props.stockData.priceData || filteredPriceData.value.length === 0) {
    console.warn('No price data available for chart path')
    return ''
  }
  
  try {
    console.log(`Calculating chart path from ${filteredPriceData.value.length} price data points`)
    
    // Filter out invalid data points
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.close === 'number' && !isNaN(d.close) && 
      typeof d.date === 'string' && d.date.trim() !== ''
    )
    
    if (validData.length === 0) {
      console.warn('No valid price data points after filtering')
      return ''
    }
    
    console.log(`Using ${validData.length} valid data points for chart path`)
    
    const startX = 40 // Left margin
    const endX = 300 - 20 // Right margin
    const points = []
    
    // Map each data point to SVG coordinates
    for (let i = 0; i < validData.length; i++) {
      const dataPoint = validData[i]
      
      // Skip invalid points
      if (!dataPoint || typeof dataPoint.close !== 'number' || isNaN(dataPoint.close)) {
        console.warn(`Skipping invalid data point at index ${i}`)
        continue
      }
      
      // Calculate x position (linear distribution across available width)
      const x = startX + (i / Math.max(1, validData.length - 1)) * (endX - startX)
      
      // Calculate y position
      const y = calculateYPosition(dataPoint.close)
      
      // Skip adding point if we got NaN for x or y
      if (!isNaN(x) && !isNaN(y)) {
        points.push(`${x},${y}`)
      } else {
        console.warn(`Calculated invalid point at index ${i}: (${x}, ${y}) for price ${dataPoint.close}`)
      }
    }
    
    if (points.length === 0) {
      console.warn('No valid points generated for chart path')
      return ''
    }
    
    console.log(`Generated ${points.length} points for chart path`)
    return points.join(' ')
  } catch (e) {
    console.error('Error generating chart path:', e)
    return ''
  }
})

// Calculate moving average path
const movingAveragePath = computed(() => {
  if (!showMA.value || !props.stockData.priceData || filteredPriceData.value.length === 0) {
    return ''
  }
  
  try {
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.close === 'number' && !isNaN(d.close)
    )
    
    if (validData.length === 0) return ''
    
    const period = Math.min(50, validData.length) // Use 50-day MA or shorter if not enough data
    const maData = []
    
    // Calculate simple moving average
    for (let i = 0; i < validData.length; i++) {
      if (i >= period - 1) {
        const slice = validData.slice(i - period + 1, i + 1)
        const sum = slice.reduce((acc, d) => acc + d.close, 0)
        const ma = sum / slice.length
        maData.push(ma)
      } else {
        // If not enough data for a full MA window, just use available data
        const slice = validData.slice(0, i + 1)
        const sum = slice.reduce((acc, d) => acc + d.close, 0)
        const ma = sum / slice.length
        maData.push(ma)
      }
    }
    
    const startX = 40 // Left margin
    const endX = 300 - 20 // Right margin
    const points = []
    
    for (let i = 0; i < maData.length; i++) {
      const x = startX + (i / Math.max(1, validData.length - 1)) * (endX - startX)
      const y = calculateYPosition(maData[i])
      
      if (!isNaN(x) && !isNaN(y)) {
        points.push(`${x},${y}`)
      }
    }
    
    return points.join(' ')
  } catch (e) {
    console.error('Error calculating moving average path:', e)
    return ''
  }
})

// Calculate the endpoint position for the marker
const endPoint = computed(() => {
  try {
    if (!props.stockData.priceData || filteredPriceData.value.length === 0) {
      console.warn('No price data available for end point')
      return null
    }
    
    // Use the last valid data point
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.close === 'number' && !isNaN(d.close)
    )
    
    if (validData.length === 0) {
      console.warn('No valid price data points after filtering for end point')
      return null
    }
    
    const lastPoint = validData[validData.length - 1]
    
    // Ensure we have a valid point 
    if (!lastPoint || typeof lastPoint.close !== 'number' || isNaN(lastPoint.close)) {
      console.warn('Last point is invalid for end point marker')
      return null
    }
    
    const y = calculateYPosition(lastPoint.close)
    
    // If calculation returns NaN, don't render the point
    if (isNaN(y)) {
      console.warn(`Invalid Y position calculated for end point: ${y}`)
      return null
    }
    
    console.log(`End point positioned at y=${y} for close price ${lastPoint.close}`)
    return {
      x: 280, // Fixed position at the end of chart
      y
    }
  } catch (e) {
    console.error('Error calculating end point position:', e)
    return null
  }
})

// Get period label based on data available
const getPeriodLabel = (): string => {
  // If we're using a manually selected period, use that
  switch (selectedPeriod.value) {
    case '1d': return '1 Day'
    case '1w': return '1 Week'
    case '1m': return '1 Month'
    case '6m': return '6 Months'
    case '1y': return '1 Year'
    case 'all': 
      // Calculate from data if "All" is selected
      break;
    default:
      // Fallback to selected period
      return selectedPeriod.value.toUpperCase()
  }
  
  if (!props.stockData.priceData || filteredPriceData.value.length < 2) {
    return '1 Year'
  }
  
  try {
    // Filter invalid dates
    const validData = filteredPriceData.value.filter(d => 
      d && typeof d.date === 'string' && d.date.trim() !== ''
    )
    
    if (validData.length < 2) {
      return '1 Year'
    }
    
    const firstDate = new Date(validData[0].date)
    const lastDate = new Date(validData[validData.length - 1].date)
    
    // Check if dates are valid
    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
      console.warn('Invalid dates in dataset:', { 
        first: validData[0].date, 
        last: validData[validData.length - 1].date
      })
      return '1 Year'
    }
    
    // Calculate the difference in days
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 7) return '1 Week'
    if (diffDays <= 31) return '1 Month'
    if (diffDays <= 93) return '3 Months'
    if (diffDays <= 186) return '6 Months'
    if (diffDays <= 370) return '1 Year'
    if (diffDays <= 740) return '2 Years'
    
    return `${Math.round(diffDays / 365)} Years`
  } catch (e) {
    console.warn('Error calculating period label:', e)
    return '1 Year'
  }
}

// Time period selection handler
const setTimePeriod = (period: string) => {
  selectedPeriod.value = period
  console.log(`Time period changed to ${period}`)
}

// Reset candlestick chart to line chart when there's insufficient data
watch(filteredPriceData, (newData) => {
  if (selectedChartType.value === 'candlestick' && (!newData || newData.length < 2)) {
    console.log('Insufficient data for candlestick chart, switching to line chart')
    selectedChartType.value = 'line'
  }
}, { immediate: true })
</script> 