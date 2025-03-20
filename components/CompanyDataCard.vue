<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <!-- Card Header -->
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Company Information</h3>
      <p class="text-sm text-gray-500">Financial and operational data</p>
    </div>
    
    <!-- Card Content -->
    <div class="p-4">
      <div v-if="!companyData || Object.keys(companyData).length === 0" class="text-center py-6">
        <p class="text-gray-500">No company data available</p>
      </div>
      
      <div v-else>
        <div v-for="(data, company) in companyData" :key="company" class="mb-6 last:mb-0">
          <div class="flex items-center mb-3">
            <h4 class="text-md font-medium text-gray-900">{{ company }}</h4>
            <div class="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
              {{ extractPeriod(data.period) }}
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="(value, key) in data.metrics" :key="key" class="border-b border-gray-200 pb-3 last:border-0">
                <div class="text-sm text-gray-500">{{ formatMetricName(key) }}</div>
                <div class="font-medium">{{ formatMetricValue(value, key) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CompanyMetric {
  [key: string]: any;
}

interface CompanyDataItem {
  period: string;
  metrics: CompanyMetric;
}

interface CompanyDataMap {
  [company: string]: CompanyDataItem;
}

const props = defineProps<{
  companyData: CompanyDataMap
}>()

// Format the metric name to be more readable
const formatMetricName = (name: string | number): string => {
  // Convert to string first
  const nameStr = String(name);
  // Convert camelCase or snake_case to spaces and capitalize
  return nameStr
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

// Format metric value based on its type
const formatMetricValue = (value: any, key: string | number): string => {
  if (value === null || value === undefined) return 'N/A';
  
  // Convert key to string
  const keyStr = String(key).toLowerCase();
  
  // Handle numbers that should be formatted as currency
  if (
    typeof value === 'number' && 
    (
      keyStr.includes('revenue') || 
      keyStr.includes('profit') || 
      keyStr.includes('income') ||
      keyStr.includes('sales') ||
      keyStr.includes('assets') ||
      keyStr.includes('liabilities') ||
      keyStr.includes('capital') ||
      keyStr.includes('market') ||
      keyStr.includes('value')
    )
  ) {
    return formatCurrency(value);
  }
  
  // Handle percentages
  if (
    typeof value === 'number' && 
    (
      keyStr.includes('margin') ||
      keyStr.includes('ratio') ||
      keyStr.includes('growth') ||
      keyStr.includes('rate') ||
      keyStr.includes('return') ||
      keyStr.includes('percentage')
    )
  ) {
    return formatPercentage(value);
  }
  
  // Handle employee counts
  if (
    typeof value === 'number' && 
    keyStr.includes('employee')
  ) {
    return value.toLocaleString();
  }
  
  // Default formatting for other number types
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  return String(value);
}

// Format as currency
const formatCurrency = (value: number): string => {
  // For large numbers, format in millions or billions
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}

// Format as percentage
const formatPercentage = (value: number): string => {
  // If value is already between 0-1, multiply by 100
  if (value >= -1 && value <= 1) {
    return `${(value * 100).toFixed(2)}%`;
  } else {
    return `${value.toFixed(2)}%`;
  }
}

// Extract period (year/quarter) from the data
const extractPeriod = (period: string): string => {
  if (!period) return '';
  
  // Handle year-quarter format (e.g. 2023Q1)
  const yearQuarterMatch = period.match(/(\d{4})Q(\d)/);
  if (yearQuarterMatch) {
    return `Q${yearQuarterMatch[2]} ${yearQuarterMatch[1]}`;
  }
  
  // Handle just year (e.g. 2023)
  const yearMatch = period.match(/(\d{4})/);
  if (yearMatch) {
    return yearMatch[1];
  }
  
  return period;
}
</script> 