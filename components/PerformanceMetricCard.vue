<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-gray-500">{{ title }}</h4>
      <div v-if="icon" class="text-gray-400">
        <svg v-if="icon === 'trending-up'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
          <polyline points="16 7 22 7 22 13"></polyline>
        </svg>
        <svg v-else-if="icon === 'arrow-up-right'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
        <svg v-else-if="icon === 'arrow-down-right'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="7" x2="17" y2="17"></line>
          <polyline points="17 7 17 17 7 17"></polyline>
        </svg>
        <svg v-else-if="icon === 'activity'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      </div>
    </div>
    <div :class="[
      'text-lg font-bold',
      shouldColorValue && positive ? 'text-green-600' : shouldColorValue ? 'text-red-600' : 'text-gray-800'
    ]">
      {{ formatValue() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    default: null
  },
  positive: {
    type: Boolean,
    default: undefined
  },
  format: {
    type: String,
    default: 'number',
    validator: (value: string) => ['number', 'percent', 'price'].includes(value)
  }
})

const shouldColorValue = computed(() => {
  return props.positive !== undefined && ['percent', 'number'].includes(props.format)
})

const formatValue = () => {
  const value = typeof props.value === 'string' ? props.value : props.value.toString()
  
  switch (props.format) {
    case 'percent':
      // If value already includes %, just return it
      if (value.includes('%')) return value
      
      // Otherwise format as percentage
      return `${parseFloat(value).toFixed(2)}%`
    
    case 'price':
      // Format as USD currency
      const numericValue = parseFloat(value.replace(/[^0-9.-]+/g, ''))
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(numericValue)
    
    case 'number':
    default:
      // Format as a number with commas
      return new Intl.NumberFormat('en-US').format(parseFloat(value))
  }
}
</script> 