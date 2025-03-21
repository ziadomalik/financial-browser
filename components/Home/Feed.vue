<template>
  <footer class="w-full h-16 bg-white border-t border-gray-200 flex items-center px-4">
    <div class="text-[#DE3819] font-bold mr-3">BREAKING NEWS</div>
    <div class="h-5 border-l border-gray-300 mr-3"></div>
    <div class="news-content flex-1 overflow-hidden whitespace-nowrap">
      <div v-for="(item, index) in recentNews" :key="index" class="inline-block mr-6 p-3 px-2 rounded-md hover:bg-gray-100 cursor-pointer">
        <span class="font-medium">{{ item.headline }}</span>
        <span class="text-gray-500 text-sm ml-2">{{ formatTime(item.datetime) }}</span>
        <span v-if="index < recentNews.length - 1" class="mx-3 text-gray-400">•</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Initial data fetch
const { data: newsItems, refresh } = await useFetch('/api/marketNews')

// If API fails, use fallback data
const fallbackNews = [
  { headline: 'S&P 500 rises 1.2% to new record high', datetime: Date.now() / 1000 - 120 },
  { headline: 'Fed signals potential rate cut in September', datetime: Date.now() / 1000 - 900 },
  { headline: 'AAPL shares jump 3% on earnings beat', datetime: Date.now() / 1000 - 1920 }
]

// If no news items, use fallback
if (!newsItems.value || newsItems.value.length === 0) {
  newsItems.value = fallbackNews
}

// Number of news items to display
const displayCount = 5

// Get the most recent news items
const recentNews = computed(() => 
  newsItems.value ? newsItems.value.slice(0, displayCount) : [])

// Format timestamp to relative time (e.g., "2m ago")
const formatTime = (timestamp) => {
  // Convert to milliseconds if needed
  const seconds = Math.floor((Date.now() / 1000) - timestamp)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Set up refreshing interval (every 60 seconds)
let refreshInterval = null

onMounted(() => {
  // Refresh the news feed every minute
  refreshInterval = setInterval(() => {
    refresh()
    console.log('Refreshed news feed')
  }, 60000)
})

onBeforeUnmount(() => {
  // Clean up interval when component is unmounted
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.news-content {
  text-overflow: ellipsis;
}
</style>